use libc::{
    c_char, c_int, close, dup2, execvp, fcntl, fork, grantpt, ioctl, kill, open, posix_openpt,
    ptsname, setsid, tcgetpgrp, unlockpt, waitpid, winsize, FD_CLOEXEC, F_SETFD, O_CLOEXEC,
    O_NOCTTY, O_RDWR, STDERR_FILENO, STDIN_FILENO, STDOUT_FILENO, TIOCSCTTY, TIOCSWINSZ,
    WEXITSTATUS, WIFEXITED, WIFSIGNALED, WNOHANG, WTERMSIG,
};
use std::ffi::{CStr, CString};
use std::ptr;
use std::slice;

#[no_mangle]
pub extern "C" fn pty_abi_version() -> i32 {
    1
}

fn set_cloexec(fd: c_int) {
    unsafe {
        fcntl(fd, F_SETFD, FD_CLOEXEC);
    }
}

#[no_mangle]
pub unsafe extern "C" fn pty_spawn(
    file_ptr: *const c_char,
    args_ptr: *const c_char,
    cwd_ptr: *const c_char,
    env_ptr: *const c_char,
    cols: i32,
    rows: i32,
    pid_out: *mut i32,
) -> i32 {
    if file_ptr.is_null()
        || args_ptr.is_null()
        || cwd_ptr.is_null()
        || env_ptr.is_null()
        || pid_out.is_null()
    {
        return -1;
    }

    let file_str = CStr::from_ptr(file_ptr).to_str().unwrap_or("");
    let args_str = CStr::from_ptr(args_ptr).to_str().unwrap_or("");
    let cwd_str = CStr::from_ptr(cwd_ptr).to_str().unwrap_or("");
    let env_str = CStr::from_ptr(env_ptr).to_str().unwrap_or("");

    let file_cstr = CString::new(file_str).unwrap_or_default();
    let cwd_cstr = CString::new(cwd_str).unwrap_or_default();

    let mut args_cstrings: Vec<CString> = args_str
        .split('\n')
        .filter(|s| !s.is_empty())
        .map(|s| CString::new(s).unwrap_or_default())
        .collect();
    args_cstrings.insert(0, file_cstr.clone());

    let env_cstrings: Vec<CString> = env_str
        .split('\n')
        .filter(|s| !s.is_empty())
        .map(|s| CString::new(s).unwrap_or_default())
        .collect();

    let mut args_ptrs: Vec<*const c_char> = args_cstrings.iter().map(|c| c.as_ptr()).collect();
    args_ptrs.push(ptr::null());

    let env_ptrs: Vec<*const c_char> = env_cstrings.iter().map(|c| c.as_ptr()).collect();

    let master_fd = posix_openpt(O_RDWR | O_NOCTTY | O_CLOEXEC);
    if master_fd < 0 {
        return -1;
    }

    if grantpt(master_fd) < 0 || unlockpt(master_fd) < 0 {
        close(master_fd);
        return -1;
    }

    let slave_name = ptsname(master_fd);
    if slave_name.is_null() {
        close(master_fd);
        return -1;
    }

    let slave_fd = open(slave_name, O_RDWR | O_NOCTTY);
    if slave_fd < 0 {
        close(master_fd);
        return -1;
    }

    let ws = winsize {
        ws_row: rows as u16,
        ws_col: cols as u16,
        ws_xpixel: 0,
        ws_ypixel: 0,
    };
    ioctl(slave_fd, TIOCSWINSZ, &ws);

    let pid = fork();
    if pid < 0 {
        close(slave_fd);
        close(master_fd);
        return -1;
    }

    if pid == 0 {
        close(master_fd);

        setsid();
        ioctl(slave_fd, TIOCSCTTY, 0);

        dup2(slave_fd, STDIN_FILENO);
        dup2(slave_fd, STDOUT_FILENO);
        dup2(slave_fd, STDERR_FILENO);
        if slave_fd > STDERR_FILENO {
            close(slave_fd);
        }

        if !cwd_str.is_empty() {
            libc::chdir(cwd_cstr.as_ptr());
        }

        libc::clearenv();
        for e in &env_cstrings {
            libc::putenv(e.as_ptr() as *mut c_char);
        }

        execvp(file_cstr.as_ptr(), args_ptrs.as_ptr() as *const *const c_char);
        libc::_exit(1);
    } else {
        close(slave_fd);
        set_cloexec(master_fd);
        *pid_out = pid;
        master_fd
    }
}

#[no_mangle]
pub unsafe extern "C" fn pty_resize(fd: i32, cols: i32, rows: i32) -> i32 {
    let ws = winsize {
        ws_row: rows as u16,
        ws_col: cols as u16,
        ws_xpixel: 0,
        ws_ypixel: 0,
    };
    if ioctl(fd, TIOCSWINSZ, &ws) < 0 {
        -1
    } else {
        0
    }
}

#[no_mangle]
pub unsafe extern "C" fn pty_wait(pid: i32, out_ptr: *mut i32) -> i32 {
    if out_ptr.is_null() {
        return -1;
    }

    let mut status: c_int = 0;
    let ret = waitpid(pid, &mut status, WNOHANG);

    if ret < 0 {
        return -1;
    } else if ret == 0 {
        return 0;
    }

    let out = slice::from_raw_parts_mut(out_ptr, 2);
    if WIFEXITED(status) {
        out[0] = WEXITSTATUS(status);
        out[1] = 0;
    } else if WIFSIGNALED(status) {
        out[0] = 0;
        out[1] = WTERMSIG(status);
    } else {
        out[0] = 0;
        out[1] = 0;
    }

    1
}

#[no_mangle]
pub unsafe extern "C" fn pty_kill(pid: i32, sig: i32) -> i32 {
    if kill(pid, sig) < 0 {
        -1
    } else {
        0
    }
}

#[no_mangle]
pub unsafe extern "C" fn pty_fg_pgid(fd: i32) -> i32 {
    let pgid = tcgetpgrp(fd);
    if pgid < 0 {
        -1
    } else {
        pgid
    }
}

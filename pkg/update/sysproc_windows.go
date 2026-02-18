//go:build windows

package update

import (
	"os/exec"
	"syscall"
)

// setSysProcAttr sets Windows-specific process attributes so the new process
// is detached from the current console/window and starts independently.
func setSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP,
	}
}

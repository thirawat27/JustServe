//go:build !windows

package update

import "os/exec"

// setSysProcAttr is a no-op on non-Windows platforms.
// The process will still be launched independently.
func setSysProcAttr(cmd *exec.Cmd) {}

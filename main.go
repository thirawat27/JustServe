package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/menu"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed build/appicon.png
var icon []byte


func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create System Tray Menu
	trayMenu := menu.NewMenu()
	trayMenu.Append(menu.Text("Show", nil, func(_ *menu.CallbackData) {
		app.showApp()
	}))
	trayMenu.Append(menu.Separator())
	trayMenu.Append(menu.Text("Quit", nil, func(_ *menu.CallbackData) {
		app.quitApp()
	}))

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "JustServe",
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		OnBeforeClose:    app.beforeClose,
		Bind: []interface{}{
			app,
		},
		// Add System Tray
		// Add System Tray - Temporarily removed due to API mismatch or cross-platform issues
		// SystemTray: &options.SystemTray{
		// 	Icon: icon,
		// 	Menu: trayMenu,
		// 	OnLeftClick: func() {
		// 		app.showApp()
		// 	},
		// },
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

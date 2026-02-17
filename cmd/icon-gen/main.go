package main

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"image/png"
	"io"
	"os"
)

func main() {
	pngPath := "frontend/src/assets/images/icon.png"
	icoPath := "build/windows/icon.ico"

	// Read PNG file
	pngFile, err := os.Open(pngPath)
	if err != nil {
		fmt.Printf("Error opening PNG file: %v\n", err)
		os.Exit(1)
	}
	defer pngFile.Close()

	pngConfig, err := png.DecodeConfig(pngFile)
	if err != nil {
		fmt.Printf("Error decoding PNG config: %v\n", err)
		os.Exit(1)
	}

	// Reset file pointer to read content
	_, err = pngFile.Seek(0, 0)
	if err != nil {
		fmt.Printf("Error seeking PNG file: %v\n", err)
		os.Exit(1)
	}

	pngData, err := io.ReadAll(pngFile)
	if err != nil {
		fmt.Printf("Error reading PNG data: %v\n", err)
		os.Exit(1)
	}

	// Create ICO file
	icoFile, err := os.Create(icoPath)
	if err != nil {
		fmt.Printf("Error creating ICO file: %v\n", err)
		os.Exit(1)
	}
	defer icoFile.Close()

	// Write ICO Header
	// Reserved (2), Type (2), Count (2)
	binary.Write(icoFile, binary.LittleEndian, uint16(0))
	binary.Write(icoFile, binary.LittleEndian, uint16(1)) // Type 1 = Icon
	binary.Write(icoFile, binary.LittleEndian, uint16(1)) // Count = 1 image

	// Write Directory Entry
	width := pngConfig.Width
	height := pngConfig.Height
	if width >= 256 { width = 0 }
	if height >= 256 { height = 0 }

	binary.Write(icoFile, binary.LittleEndian, uint8(width))
	binary.Write(icoFile, binary.LittleEndian, uint8(height))
	binary.Write(icoFile, binary.LittleEndian, uint8(0)) // Colors
	binary.Write(icoFile, binary.LittleEndian, uint8(0)) // Reserved
	binary.Write(icoFile, binary.LittleEndian, uint16(1)) // Planes
	binary.Write(icoFile, binary.LittleEndian, uint16(32)) // BPP
	binary.Write(icoFile, binary.LittleEndian, uint32(len(pngData))) // Size
	binary.Write(icoFile, binary.LittleEndian, uint32(6+16)) // Offset (Header + 1 Entry)

	// Write PNG Data
	_, err = icoFile.Write(pngData)
	if err != nil {
		fmt.Printf("Error writing PNG data to ICO: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Successfully created icon.ico")
}

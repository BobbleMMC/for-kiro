; NSIS Installer Script for Minecraft Mod Generator
; This script is included in the NSIS installer configuration

; Add custom pages and settings here
Function .onInit
  ${If} ${RunningX64}
    DetailPrint "64-bit system detected"
  ${Else}
    MessageBox MB_ICONSTOP "This application requires a 64-bit operating system."
    Quit
  ${EndIf}
FunctionEnd

; Custom install success message
Function .onInstSuccess
  MessageBox MB_ICONINFORMATION "Minecraft Mod Generator has been installed successfully!$\n$\nYou can now launch it from the Start Menu or Desktop."
FunctionEnd

; Custom uninstall success message
Function un.onUninstSuccess
  MessageBox MB_ICONINFORMATION "Minecraft Mod Generator has been uninstalled successfully."
FunctionEnd

@echo off
echo Opening firewall ports for LandHere development...
netsh advfirewall firewall add rule name="LandHere Metro 8081" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="LandHere Backend 8000" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="LandHere Expo 19000" dir=in action=allow protocol=TCP localport=19000
netsh advfirewall firewall add rule name="LandHere Expo 19001" dir=in action=allow protocol=TCP localport=19001
echo Done! Ports 8000, 8081, 19000, 19001 are now open.
pause

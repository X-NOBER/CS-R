$modelname "09_output\v_m3.mdl"
$cd "m3"
$cdtexture "01_hands"
$cdtexture "m3"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_m3_reference"


$attachment 0 "Bone48" 0.000000 -13.500000 0.000000
$attachment 1 "Bone48" 0.000000 -3.500000 0.000000


$sequence "idle" "idle" fps 12
$sequence "shoot1" "shoot1" fps 32 { event 5001 0 "21" }
$sequence "shoot2" "shoot2" fps 37 { event 5001 0 "21" }
$sequence "insert" "insert" fps 65 { event 5004 0 "weapons/m3_insertshell.wav" }
$sequence "after_reload" "after_reload" fps 38 { event 5004 0 "weapons/m3_pump.wav" }
$sequence "start_reload" "start_reload" fps 30
$sequence "draw" "draw" fps 30 { event 5004 11 "weapons/m3_pump.wav" }
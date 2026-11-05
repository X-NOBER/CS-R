$modelname "09_output\v_knife.mdl"
$cd "knife"
$cdtexture "01_hands"
$cdtexture "knife"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_knife_reference"


$sequence "idle" "idle" fps 12
$sequence "slash1" "slash1" fps 30
$sequence "slash2" "slash2" fps 30
$sequence "draw" "draw" fps 45
$sequence "stab" "stab" fps 35
$sequence "stab_miss" "stab_miss" fps 40
$sequence "midslash1" "midslash1" fps 55
$sequence "midslash2" "midslash2" fps 55
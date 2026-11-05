$modelname "09_output\v_knife_r.mdl"
$cd "knife_r"
$cdtexture "01_hands"
$cdtexture "knife_r"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_oldknife_reference"


$sequence "idle3" "idle3" fps 15
$sequence "slash1" "slash1" fps 37
$sequence "slash2" "slash2" fps 37
$sequence "draw" "draw" fps 30
$sequence "stab" "stab" fps 37
$sequence "stab_miss" "stab_miss" fps 37
$sequence "midslash1" "midslash1" fps 37
$sequence "midslash2" "midslash2" fps 37

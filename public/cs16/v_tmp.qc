$modelname "09_output\v_tmp.mdl"
$cd "tmp"
$cdtexture "01_hands"
$cdtexture "tmp"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_tmp_reference"


$attachment 0 "Bone 04" 2.500000 -15.800000 2.250000
$attachment 1 "BONE_Ejector" 0.000000 -1.000000 0.500000


$sequence "idle1" "idle1" fps 12
$sequence "reload" "reload" fps 25 { event 5004 12 "weapons/clipout1.wav" } { event 5004 32 "weapons/clipin1.wav" }
$sequence "draw" "draw" fps 18 { event 5004 16 "items/cliprelease1.wav" }
$sequence "shoot_1" "shoot_1" fps 15 { event 5001 0 "11" }
$sequence "shoot_2" "shoot_2" fps 15 { event 5001 0 "11" }
$sequence "shoot_3" "shoot_3" fps 15 { event 5001 0 "11" } 
$modelname "09_output\v_deagle.mdl"
$cd "deagle"
$cdtexture "01_hands"
$cdtexture "deagle"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_deagle_reference"


$attachment 0 "Bone 04" 2.600000 -8.800000 1.400000
$attachment 1 "Bone52" 0.000000 -2.500000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "shoot1" "shoot1" fps 40 { event 5001 0 "21" }
$sequence "shoot2" "shoot2" fps 40 { event 5001 0 "21" }
$sequence "shoot_empty" "shoot_empty" fps 40 { event 5001 0 "21" }
$sequence "reload" "reload" fps 30 { event 5004 14 "weapons/de_clipout.wav" } { event 5004 34 "weapons/de_clipin.wav" }
$sequence "draw" "draw" fps 30 { event 5004 1 "weapons/de_deploy.wav" }
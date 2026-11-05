$modelname "09_output\shield\v_shield_glock18.mdl"
$cd "shield_glock18"
$cdtexture "01_hands"
$cdtexture "02_shield"
$cdtexture "glock18"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_glock18_right_reference"

$include "02_shield\shield_bodygroup.qc"


$attachment 0 "Bone26" -2.500000 -8.700000 1.700000
$attachment 1 "USP_Slide-handle" 0.000000 -2.500000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "shoot1" "shoot1" fps 40 { event 5001 0 "21" }
$sequence "shoot2" "shoot2" fps 40 { event 5001 0 "21" }
$sequence "shoot_empty" "shoot_empty" fps 35 { event 5001 0 "21" }
$sequence "reload" "reload" fps 35 {
  { event 5004 16 "weapons/clipout1.wav" } 
  { event 5004 48 "weapons/clipin1.wav" } 
  { event 5004 62 "weapons/sliderelease1.wav" } 
 }
$sequence "draw" "draw" fps 45 { event 5004 17 "weapons/slideback1.wav" }
$sequence "shield_idle" "shield_idle" fps 15
$sequence "shield_up" "shield_up" fps 30
$sequence "shield_down" "shield_down" fps 30
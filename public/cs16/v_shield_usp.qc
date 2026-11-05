$modelname "09_output\shield\v_shield_usp.mdl"
$cd "shield_usp"
$cdtexture "01_hands"
$cdtexture "02_shield"
$cdtexture "usp"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_usp_right_reference"

$include "02_shield\shield_bodygroup.qc"


$attachment 0 "Bone54" 0.000000 -1.500000 0.000000
$attachment 1 "Bone26" -2.600000 -8.100000 1.500000



$sequence "idle1" "idle1" fps 16
$sequence "shoot1" "shoot1" fps 30 { event 5001 0 "11" }
$sequence "shoot2" "shoot2" fps 30 { event 5001 0 "11" }
$sequence "shoot_empty" "shoot_empty" fps 30 { event 5001 0 "11" }
$sequence "reload" "reload" fps 37 {
  { event 5004 17 "weapons/usp_clipout.wav" }
  { event 5004 40 "weapons/usp_clipin.wav" }
  { event 5004 82 "weapons/usp_sliderelease.wav" }
 }
$sequence "draw" "draw" fps 48 { event 5004 1 "weapons/de_deploy.wav" } { event 5004 26 "weapons/usp_slideback.wav" }
$sequence "shield_idle" "shield_idle" fps 15
$sequence "shield_up" "shield_up" fps 30
$sequence "shield_down" "shield_down" fps 30
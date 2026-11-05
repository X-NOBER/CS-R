$modelname "09_output\shield\v_shield_p228.mdl"
$cd "shield_p228"
$cdtexture "01_hands"
$cdtexture "02_shield"
$cdtexture "p228"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_p228_right_reference"

$include "02_shield\shield_bodygroup.qc"


$attachment 0 "Bone26" -2.600000 -6.800000 1.500000
$attachment 1 "Bone52" 0.000000 -2.000000 0.000000



$sequence "idle1" "idle1" fps 16
$sequence "shoot1" "shoot1" fps 34 { event 5001 0 "11" } 
$sequence "shoot2" "shoot2" fps 34 { event 5001 0 "11" } 
$sequence "shoot_empty" "shoot_empty" fps 34 { event 5001 0 "11" }
$sequence "reload" "reload" fps 35 {
  { event 5004 17 "weapons/p228_clipout.wav" } 
  { event 5004 49 "weapons/p228_clipin.wav" } 
  { event 5004 81 "weapons/p228_sliderelease.wav" } 
 }
$sequence "draw" "draw" fps 30 { event 5004 1 "weapons/de_deploy.wav" } { event 5004 15 "weapons/p228_slidepull.wav" } 
$sequence "shield_idle" "shield_idle" fps 15
$sequence "shield_up" "shield_up" fps 30
$sequence "shield_down" "shield_down" fps 30
$modelname "09_output\v_elite.mdl"
$cd "elite"
$cdtexture "01_hands"
$cdtexture "elite"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_elite_reference"


$attachment 0 "Bone63" 0.000000 -5.750000 0.000000
$attachment 1 "Bone52" 0.000000 -5.500000 0.000000
$attachment 2 "Bone63" 0.000000 -2.250000 0.000000
$attachment 3 "Bone52" 0.000000 -2.000000 0.000000


$sequence "idle" "idle" fps 16 
$sequence "idle_leftempty" "idle_leftempty" fps 16 
$sequence "shoot_left1" "shoot_left1" fps 40 { event 5001 0 "11" } 
$sequence "shoot_left2" "shoot_left2" fps 40 { event 5001 0 "11" } 
$sequence "shoot_left3" "shoot_left3" fps 40 { event 5001 0 "11" } 
$sequence "shoot_left4" "shoot_left4" fps 40 { event 5001 0 "11" } 
$sequence "shoot_left5" "shoot_left5" fps 40 { event 5001 0 "11" } 
$sequence "shoot_leftlast" "shoot_leftlast" fps 40 { event 5001 0 "11" } 
$sequence "shoot_right1" "shoot_right1" fps 40 { event 5011 0 "11" } 
$sequence "shoot_right2" "shoot_right2" fps 40 { event 5011 0 "11" } 
$sequence "shoot_right3" "shoot_right3" fps 40 { event 5011 0 "11" } 
$sequence "shoot_right4" "shoot_right4" fps 40 { event 5011 0 "11" } 
$sequence "shoot_right5" "shoot_right5" fps 40 { event 5011 0 "11" } 
$sequence "shoot_rightlast" "shoot_rightlast" fps 40 { event 5011 0 "11" } 
$sequence "reload" "reload" fps 30 {
  { event 5004 6 "weapons/elite_reloadstart.wav" } 
  { event 5004 44 "weapons/elite_leftclipin.wav" } 
  { event 5004 73 "weapons/elite_clipout.wav" } 
  { event 5004 82 "weapons/elite_sliderelease.wav" } 
  { event 5004 112 "weapons/elite_rightclipin.wav" } 
  { event 5004 125 "weapons/elite_sliderelease.wav" } 
 }
$sequence "draw" "draw" fps 30 { event 5004 1 "weapons/elite_deploy.wav" }
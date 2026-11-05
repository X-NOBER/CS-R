$modelname "09_output\v_fiveseven.mdl"
$cd "fiveseven"
$cdtexture "01_hands"
$cdtexture "fiveseven"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_fiveseven_reference"


$attachment 0 "Bone53" 0.000000 -6.000000 0.000000
$attachment 1 "Bone53" 0.000000 -2.500000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "shoot1" "shoot1" fps 36 { event 5001 0 "11" }
$sequence "shoot2" "shoot2" fps 36 { event 5001 0 "11" }
$sequence "shoot_empty" "shoot_empty" fps 36 { event 5001 0 "11" }
$sequence "reload" "reload" fps 30 {
  { event 5004 15 "weapons/fiveseven_clipout.wav" }
  { event 5004 41 "weapons/fiveseven_clipin.wav" }
  { event 5004 75 "weapons/fiveseven_sliderelease.wav" }
 }
$sequence "draw" "draw" fps 30 { event 5004 13 "weapons/fiveseven_slidepull.wav" }
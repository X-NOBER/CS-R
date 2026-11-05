$modelname "09_output\v_aug.mdl"
$cd "aug"
$cdtexture "01_hands"
$cdtexture "aug"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_aug_reference"


$attachment 0 "Bone 04" 2.400000 -15.700000 1.100000
$attachment 1 "Bone50" -0.750000 4.000000 0.750000


$sequence "idle" "idle" fps 30
$sequence "reload" "reload" fps 40 {
  { event 5004 10 "weapons/aug_boltpull.wav" }
  { event 5004 50 "weapons/aug_clipout.wav" }
  { event 5004 88 "weapons/aug_clipin.wav" }
  { event 5004 112 "weapons/aug_boltslap.wav" }
 }
$sequence "draw" "draw" fps 35 { event 5004 9 "weapons/aug_forearm.wav" }
$sequence "shoot1" "shoot1" fps 35 { event 5001 0 "22" }
$sequence "shoot2" "shoot2" fps 35 { event 5001 0 "22" }
$sequence "shoot3" "shoot3" fps 35 { event 5001 0 "22" }
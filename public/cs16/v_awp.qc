$modelname "09_output\v_awp.mdl"
$cd "awp"
$cdtexture "01_hands"
$cdtexture "awp"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_awp_reference"


$attachment 0 "Bone50" 0.000000 -22.000000 0.000000
$attachment 1 "Bone50" 0.000000 -4.500000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "shoot1" "shoot1" fps 35 {
  { event 5001 0 "31" }
  { event 5004 15 "weapons/boltup.wav" }
  { event 5004 19 "weapons/boltpull1.wav" }
  { event 5004 32 "weapons/boltdown.wav" }
 }
$sequence "shoot2" "shoot2" fps 35 {
  { event 5001 0 "31" }
  { event 5004 15 "weapons/boltup.wav" }
  { event 5004 19 "weapons/boltpull1.wav" }
  { event 5004 32 "weapons/boltdown.wav" }
 }
$sequence "shoot3" "shoot3" fps 35 {
  { event 5001 0 "31" }
  { event 5004 15 "weapons/boltup.wav" }
  { event 5004 19 "weapons/boltpull1.wav" }
  { event 5004 32 "weapons/boltdown.wav" }
 }
$sequence "reload" "reload" fps 30 { event 5004 26 "weapons/awp_clipout.wav" } { event 5004 53 "weapons/awp_clipin.wav" }
$sequence "draw" "draw" fps 30
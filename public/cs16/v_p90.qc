$modelname "09_output\v_p90.mdl"
$cd "p90"
$cdtexture "01_hands"
$cdtexture "p90"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_p90_reference"


$attachment 0 "Bone 04" 1.900000 -8.600000 1.500000
$attachment 1 "Bone48" 1.000000 -2.000000 0.000000


$sequence "idle" "idle" fps 30
$sequence "reload" "reload" fps 40 {
  { event 5004 17 "weapons/p90_cliprelease.wav" }
  { event 5004 35 "weapons/p90_clipout.wav" }
  { event 5004 75 "weapons/p90_clipin.wav" }
  { event 5004 108 "weapons/p90_boltpull.wav" }
 }
$sequence "draw" "draw" fps 30 { event 5004 9 "weapons/p90_boltpull.wav" }
$sequence "shoot1" "shoot1" fps 30 { event 5001 0 "12" }
$sequence "shoot2" "shoot2" fps 30 { event 5001 0 "12" }
$sequence "shoot3" "shoot3" fps 30 { event 5001 0 "12" }
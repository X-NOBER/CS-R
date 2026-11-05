$modelname "09_output\v_mac10.mdl"
$cd "mac10"
$cdtexture "01_hands"
$cdtexture "mac10"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_mac10_reference"


$attachment 0 "Bone 04" 2.000000 -8.000000 0.500000
$attachment 1 "Bone48" 0.000000 -2.000000 0.000000


$sequence "idle1" "idle1" fps 12
$sequence "reload" "reload" fps 35 {
  { event 5004 22 "weapons/mac10_clipout.wav" }
  { event 5004 55 "weapons/mac10_clipin.wav" }
  { event 5004 87 "weapons/mac10_boltpull.wav" }
 }
$sequence "draw" "draw" fps 33 { event 5004 22 "items/cliprelease1.wav" }
$sequence "shoot1" "shoot1" fps 27 { event 5001 0 "11" }
$sequence "shoot2" "shoot2" fps 27 { event 5001 0 "11" }
$sequence "shoot3" "shoot3" fps 27 { event 5001 0 "11" }
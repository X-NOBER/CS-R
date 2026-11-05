$modelname "09_output\v_sg552.mdl"
$cd "sg552"
$cdtexture "01_hands"
$cdtexture "sg552"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_sg552_reference"


$attachment 0 "Bone48" 0.000000 -11.250000 -0.500000
$attachment 1 "Bone48" 0.000000 -1.000000 0.000000


$sequence "idle" "idle" fps 30
$sequence "reload" "reload" fps 37 {
  { event 5004 16 "weapons/sg552_clipout.wav" }
  { event 5004 61 "weapons/sg552_clipin.wav" }
  { event 5004 90 "weapons/sg552_boltpull.wav" }
 }
$sequence "draw" "draw" fps 37 { event 5004 12 "weapons/sg552_boltpull.wav" }
$sequence "shoot1" "shoot1" fps 35 { event 5001 0 "22" }
$sequence "shoot2" "shoot2" fps 35 { event 5001 0 "22" }
$sequence "shoot3" "shoot3" fps 35 { event 5001 0 "22" }
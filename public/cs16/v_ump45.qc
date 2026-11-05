$modelname "09_output\v_ump45.mdl"
$cd "ump45"
$cdtexture "01_hands"
$cdtexture "ump45"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_ump45_reference"


$attachment 0 "Bone51" 0.000000 -8.300000 0.000000
$attachment 1 "Bone51" 0.000000 -1.000000 0.000000


$sequence "idle1" "idle1" fps 12
$sequence "reload" "reload" fps 33 {
  { event 5004 23 "weapons/ump45_clipout.wav" }
  { event 5004 59 "weapons/ump45_clipin.wav" }
  { event 5004 86 "weapons/ump45_boltslap.wav" }
 }
$sequence "draw" "draw" fps 30
$sequence "shoot1" "shoot1" fps 32 { event 5001 0 "11" } { event 5001 0 "11" }
$sequence "shoot2" "shoot2" fps 32 { event 5001 0 "11" } { event 5001 0 "11" }
$sequence "shoot3" "shoot3" fps 32 { event 5001 0 "11" } { event 5001 0 "11" }
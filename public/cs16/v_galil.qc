$modelname "09_output\v_galil.mdl"
$cd "galil"
$cdtexture "01_hands"
$cdtexture "galil"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_galil_reference"


$attachment 0 "Bone 04" 2.900000 -24.120001 0.170000
$attachment 1 "Dummy - chamber" 0.000000 0.000000 0.000000


$sequence "idle" "idle" fps 30
$sequence "reload" "reload" fps 34 {
  { event 5004 14 "weapons/galil_clipout.wav" }
  { event 5004 56 "weapons/galil_clipin.wav" }
  { event 5004 70 "weapons/galil_boltpull.wav" }
 }
$sequence "draw" "draw" fps 35 { event 5004 10 "weapons/galil_boltpull.wav" }
$sequence "shoot1" "shoot1" fps 35 { event 5001 0 "22" }
$sequence "shoot2" "shoot2" fps 35 { event 5001 0 "22" }
$sequence "shoot3" "shoot3" fps 35 { event 5001 0 "22" }
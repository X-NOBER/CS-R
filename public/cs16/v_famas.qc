$modelname "09_output\v_famas.mdl"
$cd "famas"
$cdtexture "01_hands"
$cdtexture "famas"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_famas_reference"


$attachment 0 "Dummy - famas mag" 20.500000 0.530000 0.000000
$attachment 1 "Dummy - famas mag" 0.000000 0.500000 0.600000


$sequence "idle" "idle" fps 30
$sequence "reload" "reload" fps 30 {
  { event 5004 18 "weapons/famas_clipout.wav" }
  { event 5004 42 "weapons/famas_clipin.wav" }
  { event 5004 55 "weapons/famas_forearm.wav" }
 }
$sequence "draw" "draw" fps 30 { event 5004 8 "weapons/famas_forearm.wav" }
$sequence "shoot1" "shoot1" fps 35 { event 5001 0 "22" }
$sequence "shoot2" "shoot2" fps 35 { event 5001 0 "22" }
$sequence "shoot3" "shoot3" fps 35 { event 5001 0 "22" }
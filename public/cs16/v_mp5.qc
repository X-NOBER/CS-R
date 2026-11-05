$modelname "09_output\v_mp5.mdl"
$cd "mp5"
$cdtexture "01_hands"
$cdtexture "mp5"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_mp5_reference"


$attachment 0 "Bone 04" 3.400000 -13.700000 2.500000
$attachment 1 "Bone54" 0.000000 -1.500000 0.000000


$sequence "idle1" "idle1" fps 12
$sequence "reload" "reload" fps 38 {
  { event 5004 15 "weapons/mp5_clipout.wav" }
  { event 5004 46 "weapons/mp5_clipin.wav" }
  { event 5004 77 "weapons/mp5_slideback.wav" }
 }
$sequence "draw" "draw" fps 35 { event 5004 13 "weapons/mp5_slideback.wav" }
$sequence "shoot1" "shoot1" fps 30 { event 5001 0 "11" }
$sequence "shoot2" "shoot2" fps 30 { event 5001 0 "11" }
$sequence "shoot3" "shoot3" fps 30 { event 5001 0 "11" }
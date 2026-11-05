$modelname "09_output\v_g3sg1.mdl"
$cd "g3sg1"
$cdtexture "01_hands"
$cdtexture "g3sg1"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_g3sg1_reference"


$attachment 0 "Bone 04" 3.250000 -22.750000 3.450000
$attachment 1 "Bone52" 0.000000 -2.000000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "shoot" "shoot" fps 30 { event 5001 0 "22" }
$sequence "shoot2" "shoot2" fps 30 { event 5001 0 "22" }
$sequence "reload" "reload" fps 40 {
  { event 5004 14 "weapons/g3sg1_slide.wav" }
  { event 5004 46 "weapons/g3sg1_clipout.wav" }
  { event 5004 90 "weapons/g3sg1_clipin.wav" }
  { event 5004 120 "weapons/g3sg1_slide.wav" }
 }
$sequence "draw" "draw" fps 30
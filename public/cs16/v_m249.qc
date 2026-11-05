$modelname "09_output\v_m249.mdl"
$cd "m249"
$cdtexture "01_hands"
$cdtexture "m249"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_m249_reference"


$attachment 0 "Bone 04" 3.600000 -18.400000 2.750000
$attachment 1 "Bone58" 0.000000 0.000000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "shoot1" "shoot1" fps 30 { event 5001 0 "22" }
$sequence "shoot2" "shoot2" fps 30 { event 5001 0 "22" }
$sequence "reload" "reload" fps 30 {
  { event 5004 25 "weapons/m249_coverup.wav" }
  { event 5004 46 "weapons/m249_boxout.wav" }
  { event 5004 67 "weapons/m249_boxin.wav" }
  { event 5004 87 "weapons/m249_chain.wav" }
  { event 5004 107 "weapons/m249_coverdown.wav" }
 }
$sequence "draw" "draw" fps 30 { event 5004 21 "weapons/slideback1.wav" }
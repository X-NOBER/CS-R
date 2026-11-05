$modelname "09_output\v_c4.mdl"
$cd "c4"
$cdtexture "01_hands"
$cdtexture "c4"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_c4_reference"


$sequence "idle1" "idle1" fps 12
$sequence "draw" "draw" fps 30
$sequence "drop" "drop" fps 30
$sequence "pressbutton" "pressbutton" fps 33 {
  { event 5004 39 "weapons/c4_click.wav" }
  { event 5004 47 "weapons/c4_click.wav" }
  { event 5004 54 "weapons/c4_click.wav" }
  { event 5004 62 "weapons/c4_click.wav" }
  { event 5004 70 "weapons/c4_click.wav" }
  { event 5004 78 "weapons/c4_click.wav" }
  { event 5004 84 "weapons/c4_click.wav" }
 }
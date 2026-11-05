$modelname "09_output\v_glock18.mdl"
$cd "glock18"
$cdtexture "01_hands"
$cdtexture "glock18"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_glock18_reference"


$attachment 0 "Bone 04" 2.500000 -8.700000 1.700000
$attachment 1 "USP_Slide-handle" 0.000000 -2.500000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "idle2" "idle2" fps 20
$sequence "idle3" "idle3" fps 18
$sequence "shoot" "shoot" fps 40 {
  { event 5001 0 "21" }
  { event 5001 2 "21" }
  { event 5001 4 "21" }
 }
$sequence "shoot2" "shoot2" fps 40 {
  { event 5001 0 "21" }
  { event 5001 2 "21" }
  { event 5001 4 "21" }
 }
$sequence "shoot3" "shoot3" fps 40 { event 5001 0 "21" }
$sequence "shoot_empty" "shoot_empty" fps 35 { event 5001 0 "21" }
$sequence "reload" "reload" fps 35 {
  { event 5004 16 "weapons/clipout1.wav" }
  { event 5004 48 "weapons/clipin1.wav" }
  { event 5004 62 "weapons/sliderelease1.wav" }
 }
$sequence "draw" "draw" fps 45 { event 5004 17 "weapons/slideback1.wav" }
$sequence "holster" "holster" fps 25
$sequence "add_silencer" "add_silencer" fps 20
$sequence "draw2" "draw2" fps 45 { event 5004 22 "weapons/slideback1.wav" }
$sequence "reload2" "reload2" fps 30 {
  { event 5004 11 "weapons/clipout1.wav" }
  { event 5004 32 "weapons/clipin1.wav" }
  { event 5004 43 "weapons/sliderelease1.wav" }
 }
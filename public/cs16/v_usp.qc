$modelname "09_output\v_usp.mdl"
$cd "usp"
$cdtexture "01_hands"
$cdtexture "usp"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_usp_reference"


$attachment 0 "Bone 04" 2.600000 -13.300000 2.000000
$attachment 1 "Bone54" 0.000000 -1.500000 0.000000
$attachment 2 "Bone 04" 2.600000 -8.100000 1.500000


$sequence "idle" "idle" fps 16
$sequence "shoot1" "shoot1" fps 30 { event 5001 0 "11" }
$sequence "shoot2" "shoot2" fps 30 { event 5001 0 "11" }
$sequence "shoot3" "shoot3" fps 30 { event 5001 0 "11" }
$sequence "shootlast" "shootlast" fps 32 { event 5001 0 "11" }
$sequence "reload" "reload" fps 37 {
  { event 5004 17 "weapons/usp_clipout.wav" }
  { event 5004 40 "weapons/usp_clipin.wav" }
  { event 5004 82 "weapons/usp_sliderelease.wav" }
 }
$sequence "draw" "draw" fps 48 { event 5004 1 "weapons/de_deploy.wav" } { event 5004 26 "weapons/usp_slideback.wav" }
$sequence "add_silencer" "add_silencer" fps 37 { event 5004 38 "weapons/usp_silencer_on.wav" }
$sequence "idle_unsil" "idle_unsil" fps 16
$sequence "shoot1_unsil" "shoot1_unsil" fps 30 { event 5021 0 "11" }
$sequence "shoot2_unsil" "shoot2_unsil" fps 30 { event 5021 0 "11" }
$sequence "shoot3_unsil" "shoot3_unsil" fps 30 { event 5021 0 "11" }
$sequence "shootlast_unsil" "shootlast_unsil" fps 32 { event 5021 0 "11" }
$sequence "reload_unsil" "reload_unsil" fps 37 {
  { event 5004 17 "weapons/usp_clipout.wav" }
  { event 5004 40 "weapons/usp_clipin.wav" }
  { event 5004 82 "weapons/usp_sliderelease.wav" }
 }
$sequence "draw_unsil" "draw_unsil" fps 48 { event 5004 1 "weapons/de_deploy.wav" } { event 5004 26 "weapons/usp_slideback.wav" }
$sequence "detach_silencer" "detach_silencer" fps 37 { event 5004 29 "weapons/usp_silencer_off.wav" }
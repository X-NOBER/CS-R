$modelname "09_output\v_m4a1.mdl"
$cd "m4a1"
$cdtexture "01_hands"
$cdtexture "m4a1"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_m4a1_reference"


$attachment 0 "Bone50" 0.000000 -18.500000 0.000000
$attachment 1 "Bone50" 0.000000 -1.250000 0.000000
$attachment 2 "Bone50" 0.000000 -14.250000 0.000000


$sequence "idle" "idle" fps 16
$sequence "shoot1" "shoot1" fps 20 { event 5001 0 "11" }
$sequence "shoot2" "shoot2" fps 20 { event 5001 0 "11" }
$sequence "shoot3" "shoot3" fps 20 { event 5001 0 "11" }
$sequence "reload" "reload" fps 37 {
  { event 5004 25 "weapons/m4a1_clipout.wav" }
  { event 5004 53 "weapons/m4a1_clipin.wav" }
  { event 5004 88 "weapons/m4a1_boltpull.wav" }
 }
$sequence "draw" "draw" fps 40 { event 5004 1 "weapons/m4a1_deploy.wav" } { event 5004 17 "weapons/m4a1_boltpull.wav" }
$sequence "add_silencer" "add_silencer" fps 30 { event 5004 28 "weapons/m4a1_silencer_on.wav" }
$sequence "idle_unsil" "idle_unsil" fps 16
$sequence "shoot1_unsil" "shoot1_unsil" fps 20 { event 5021 0 "22" }
$sequence "shoot2_unsil" "shoot2_unsil" fps 20 { event 5021 0 "22" }
$sequence "shoot3_unsil" "shoot3_unsil" fps 20 { event 5021 0 "22" }
$sequence "reload_unsil" "reload_unsil" fps 37 {
  { event 5004 25 "weapons/m4a1_clipout.wav" }
  { event 5004 53 "weapons/m4a1_clipin.wav" }
  { event 5004 88 "weapons/m4a1_boltpull.wav" }
 }
$sequence "draw_unsil" "draw_unsil" fps 40 { event 5004 1 "weapons/m4a1_deploy.wav" } { event 5004 17 "weapons/m4a1_boltpull.wav" }
$sequence "detach_silencer" "detach_silencer" fps 30 { event 5004 21 "weapons/m4a1_silencer_off.wav" }
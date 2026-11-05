$modelname "09_output\v_scout.mdl"
$cd "scout"
$cdtexture "01_hands"
$cdtexture "scout"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_scout_reference"


$attachment 0 "Bone 04" 11.800000 -20.500000 2.250000
$attachment 1 "Bone49" 0.000000 -4.500000 0.000000


$sequence "idle1" "idle1" fps 16
$sequence "shoot_1" "shoot_1" fps 35 { event 5001 0 "21" } { event 5004 13 "weapons/scout_bolt.wav" }
$sequence "shoot_2" "shoot_2" fps 35 { event 5001 0 "21" } { event 5004 13 "weapons/scout_bolt.wav" }
$sequence "reload" "reload" fps 30 { event 5004 13 "weapons/scout_clipout.wav" } { event 5004 37 "weapons/scout_clipin.wav" }
$sequence "draw" "draw" fps 30
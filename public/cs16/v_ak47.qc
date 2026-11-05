$modelname "09_output\v_ak47.mdl"
$cd "ak47"
$cdtexture "01_hands"
$cdtexture "ak47"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_ak47_reference"


$attachment 0 "Bone 04" 2.750000 -22.500000 2.900000
$attachment 1 "Bone52" 0.000000 -3.000000 0.000000


$sequence "idle1" "idle1" fps 30
$sequence "reload" "reload" fps 37 { event 5004 13 "weapons/ak47_clipout.wav" } { event 5004 57 "weapons/ak47_clipin.wav" }
$sequence "draw" "draw" fps 30 { event 5004 11 "weapons/ak47_boltpull.wav" }
$sequence "shoot1" "shoot1" fps 20 { event 5001 0 "22" }
$sequence "shoot2" "shoot2" fps 20 { event 5001 0 "22" }
$sequence "shoot3" "shoot3" fps 20 { event 5001 0 "22" }
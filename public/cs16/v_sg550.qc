$modelname "09_output\v_sg550.mdl"
$cd "sg550"
$cdtexture "01_hands"
$cdtexture "sg550"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_sg550_reference"


$attachment 0 "Bone55" 0.000000 -25.200001 -1.100000
$attachment 1 "Bone55" 0.000000 -3.000000 0.000000


$sequence "idle1" "idle1" fps 16 
$sequence "shoot" "shoot" fps 45 { event 5001 0 "22" } 
$sequence "shoot2" "shoot2" fps 45 { event 5001 0 "22" } 
$sequence "reload" "reload" fps 28 {
  { event 5004 22 "weapons/sg550_clipout.wav" } 
  { event 5004 46 "weapons/sg550_clipin.wav" } 
  { event 5004 82 "weapons/sg550_boltpull.wav" } 
 }
$sequence "draw" "draw" fps 30

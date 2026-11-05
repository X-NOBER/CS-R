$modelname "09_output\v_xm1014.mdl"
$cd "xm1014"
$cdtexture "01_hands"
$cdtexture "xm1014"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_xm1014_reference"


$attachment 0 "Bone 04" 3.250000 -21.200001 2.950000
$attachment 1 "Bone52" 0.000000 -2.500000 0.000000


$sequence "idle" "idle" fps 12
$sequence "shoot1" "shoot1" fps 40 { event 5001 0 "21" }
$sequence "shoot2" "shoot2" fps 40 { event 5001 0 "21" }
$sequence "insert" "insert" fps 90
$sequence "after_reload" "after_reload" fps 30
$sequence "start_reload" "start_reload" fps 30 { event 5004 20 "items/cliprelease1.wav" }
$sequence "draw" "draw" fps 30 { event 5004 1 "weapons/de_deploy.wav" } 

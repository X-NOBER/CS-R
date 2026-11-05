$modelname "09_output\shield\v_shield_knife.mdl"
$cd "shield_knife"
$cdtexture "01_hands"
$cdtexture "02_shield"
$cdtexture "knife"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "..\knife\CS_knife_reference"

$include "02_shield\shield_bodygroup.qc"


$sequence "idle" "idle" fps 16
$sequence "slash" "slash" fps 55
$sequence "hit" "hit" fps 55
$sequence "deploy" "deploy" fps 45
$sequence "shield_idle" "shield_idle" fps 15
$sequence "shield_up" "shield_up" fps 30
$sequence "shield_down" "shield_down" fps 30
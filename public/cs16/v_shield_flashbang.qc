$modelname "09_output\shield\v_shield_flashbang.mdl"
$cd "shield_grenades"
$cdtexture "01_hands"
$cdtexture "02_shield"
$cdtexture "grenades"
//$scale 1.0
$cliptotextures


$bbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$cbox 0.000000 0.000000 0.000000 0.000000 0.000000 0.000000
$eyeposition 0.000000 0.000000 0.000000


$include "01_hands\hands_bodygroup.qc"

$body "weapon" "CS_flashbang_right_reference"

$include "02_shield\shield_bodygroup.qc"


$include "shield_grenades\shield_gren_anims.qc"

All models aim to use a target QC file for determining which hands reference will be used.

To change which hands reference will be used, go to the "01_hands" folder and open the "hands_bodygroup.qc" with a simple text editor.

To enable a specific hands reference, you will need to remove the commentary // at the start of the line. To disable a specific hands reference, simply add // at the start of the line, so the compiler will ignore it.

You can compile each model individually if you desire to do so, however you can use "0_compile_all.bat" to compile all models at once.

The compiled models will be stored in "09_output".
Attribute VB_Name = "A_MOD_EXPORT"
Option Explicit

Sub Auto_Open()
Dim pass As String, ruta As String, i As Integer, j As Integer
pass = "notoques": Application.ScreenUpdating = False: Application.DisplayAlerts = False
On Error GoTo loguear_usuario_fin
If Sheets(1).Range("A1").Value <> "" Then
    Range("C9") = "PROCESANDO...": Range("C10") = "": Range("C9").Font.Color = -1003520
    ruta = ThisWorkbook.Path
    i = InStrRev(ruta, "\", -1, 0): i = InStrRev(ruta, "\", i - 1, 0): i = InStrRev(ruta, "\", i - 1, 0)
    ruta = Mid(ruta, 1, i)
    Workbooks.Open ruta & ThisWorkbook.Sheets(1).Range("A6").Value
    Sheets("CURRENT_USER").Unprotect pass: ActiveWorkbook.Unprotect pass
    'VUELCA LOS DATOS EN LA HOJA "CURRENT USER"
    With Sheets("CURRENT_USER")
        .Range("B1") = ""
        .Range("B2") = ThisWorkbook.Sheets(1).Range("A2").Value
        .Range("B3") = ThisWorkbook.Sheets(1).Range("A3").Value
        .Range("B4") = ThisWorkbook.Sheets(1).Range("A4").Value
        .Range("B5") = ThisWorkbook.Sheets(1).Range("A5").Value
    End With
    Sheets("CURRENT_USER").Protect pass
    Application.ScreenUpdating = True
    Sheets("CONTRATOS").Visible = True: Sheets("CONTRATOS").Select: Sheets("LOG IN").Visible = False: Sheets("Configuración de Excel").Visible = True
    On Error Resume Next
    j = Sheets("CFG_USUARIOS").Range("F:F").Find(Sheets("CURRENT_USER").Range("B4").Value).Row
    On Error GoTo loguear_usuario_fin
    If j <> 0 Then Sheets("CONTRATOS").Shapes("btn_indicadores").Visible = True: Sheets("CONTRATOS").Shapes("btn_permisos").Visible = True: j = 0
    On Error Resume Next
    j = Sheets("PERMISOS").Range("C:C").Find(Sheets("CURRENT_USER").Range("B4").Value).Row
    On Error GoTo loguear_usuario_fin
    If Sheets("PERMISOS").Cells(j, 4).Value = "SI" Then Sheets("CONTRATOS").Shapes("btn_indicadores").Visible = True
    Application.Run "'" & ThisWorkbook.Sheets(1).Range("A6").Value & "'!aprueba_a_distancia", ThisWorkbook.Sheets(1).Range("A1").Value, ThisWorkbook.name
    Application.DisplayAlerts = True
    Exit Sub
loguear_usuario_fin:
Application.DisplayAlerts = True: Application.ScreenUpdating = True
End If
End Sub

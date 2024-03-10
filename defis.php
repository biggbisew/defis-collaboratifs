<?php
include_once 'priv.php';
$debug = FALSE ;
$link ; 

function preventHacking ( $name, $instr ) {
  $bannedTags = array ('APPLET', 'BODY', 'EMBED', 'FORM', 'HEAD','HTML', 'IFRAME', 'LINK', 'META', 'NOEMBED','NOFRAMES', 'NOSCRIPT', 'OBJECT', 'SCRIPT',);
  $failed = false;
  if ( is_array ( $instr ) ) {
    for ( $j = 0; $j < count ( $instr ); $j++ ) {
      for ( $i = 0; $i < count ( $bannedTags ) && ! $failed; $i++ ) {
        // First, replace any escape characters like '\x3c'
        $teststr = preg_replace ( "#(\\\x[0-9A-F]{2})#e","chr(hexdec('\\1'))", $instr[$j] );
        if ( preg_match ( "/<\s*$bannedTags[$i]/i", $teststr ) ) {
          $failed = true;
        }
      }
    }
  } else {
    // Not an array : First, replace any escape characters like '\x3c'
    $teststr = preg_replace ( "#(\\\x[0-9A-F]{2})#e","chr(hexdec('\\1'))", $instr );
    for ( $i = 0; $i < count ( $bannedTags ) && ! $failed; $i++ ) {
      if ( preg_match ( "/<\s*$bannedTags[$i]/i", $teststr ) ) {
        $failed = true;
      }
    }
  }
  
  if ( $failed ) {
    $link->close() ;
    die('Fatal Error : Invalid data format for ' . $name );
  }
}


function getPostValue ( $name ) {
    $postName = null;
    if ( isset ( $_POST ) && is_array ( $_POST ) && isset ( $_POST[$name] ) )
      $postName = ( get_magic_quotes_gpc () != 0 ? $_POST[$name] : (is_array ( $_POST[$name] ) ? array_map ( 'addslashes',  $_POST[$name] ): addslashes ( $_POST[$name] ) ) );
    preventHacking ( $name, $postName );
    return $postName;
}

////////////////////////////////////////////////////////

$cmd = getPostValue('cmd');  // cmd = get_sessions,new_session,get_defis,new_defi,update_defi
$id  = getPostValue('id');   // get session idx
$idx = getPostValue('idx');  // update defi
$incr= getPostValue('incr'); // update defi      ou nouveau defi
$name= getPostValue('name'); // Nouvelle session ou nouveau defi
$link= new mysqli($ur,$us,$pw,$db);

if ($link->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

if ($cmd == 'get_sessions') { // On renvoie un Json avec la liste des sessions
    $res = '' ;
    $sql_res = mysqli_query($link, "SELECT ID_session,nom_session FROM `defis_collectifs` ORDER BY ID_session DESC");
    if ($sql_res->num_rows > 0) {
        while($row = $sql_res->fetch_assoc()) {
            $res .= (($res == '')?'':',') . '{"id":"' . $row["ID_session"] . '","nom":"' . $row["nom_session"] . '"}' ;
        }
    }
    echo "[" . $res . "]";
} else if ($cmd == 'get_defis') { // On renvoie un Json avec la liste des defis de la session
    $res = '' ;
    $sql_res = mysqli_query($link, "SELECT * FROM `defis_collectifs` where `ID_session`=$id; ");
    if ($sql_res->num_rows > 0) { // A priori, exactement 1 resultat sera retourné
        while($row = $sql_res->fetch_assoc()) {
            for ($i = 1; $i <= 43; $i++) {
                $goal = $row["goal_".$i];
                $nom = $row["defi_" . $i] ;
                $nb = $row["nb_" . $i] ;
                if ( ($nom != "" ) && ( $goal>0)) { 
                    $res .= (($res == '')?'':',') . '{"nom":"' . $nom . '","nb":"' . $nb . '","goal":"' . $goal . '"}' ;
                }
            }
        }
    }
    echo "[" . $res . "]";
} else if ($cmd == "new_session") { // Renvoie l'ID de la nouvelle session
    $sql_res = mysqli_query($link, "INSERT INTO `defis_collectifs` (nom_session) VALUES ('$name'); ");
    $ins_id = mysqli_insert_id($link);
    echo $ins_id ;
} else if ($cmd == "new_defi") {
    $sql_res = mysqli_query($link, "SELECT * FROM `defis_collectifs` where `ID_session`=$id; ");
    if ($sql_res->num_rows > 0) { // A priori, exactement 1 resultat sera retourné
        while($row = $sql_res->fetch_assoc()) {
            $sql_idx = 1 ;
            for (; $sql_idx <= 43; $sql_idx++) {
                $goal = $row["goal_".$sql_idx];
                $nom = $row["defi_" . $sql_idx] ;
                if ( ($nom == "" ) || ( $goal==0)) { 
                    break;
                }
            }
            mysqli_query($link,"UPDATE `defis_collectifs` SET `defi_${sql_idx}`='$name',`nb_${sql_idx}`=0,`goal_${sql_idx}`=$incr WHERE `ID_session`=$id; ");
            echo "$sql_idx";
        }
    }
} else if ($cmd == 'update_defi') {  // On ne renvoie rien du tout. On update le champ qui va bien
  $sql_res = mysqli_query($link, "SELECT nb_${idx} FROM `defis_collectifs` where `ID_session`=$id; ");
  $v = -1 ;
  if ($sql_res->num_rows > 0) {
      while($row = $sql_res->fetch_assoc()) {
          $v = $row["nb_".$idx];
      }
  }
  if ($v != -1) {
      $up = $v + $incr ;
      mysqli_query($link, "UPDATE `defis_collectifs` SET `nb_${idx}`=$up WHERE `ID_session`=$id; ");
  }
}

$link->close() ;
?>

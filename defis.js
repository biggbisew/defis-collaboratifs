var list_sessions_int_id=0;
var list_defis_int_id = 0;
var session_id = 0 ;
var session_name = "" ;



// ###############################
// containsSpecialChars(str)
// - renvoie vrai si str contient un caractere non autorise
// ###############################
function containsSpecialChars(str) {
    // const specialChars = /[`!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/;
    const specialChars = /[`@#$^&*+=\[\]{};'"\\|<>\/~]/; 
    return specialChars.test(str);
}



// ###############################
// pad(num,size)
// - renvoie num avec des leading zeros pour obtenir au moins size caracteres
// ###############################
function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}



// ###############################
// reset_values()
// - (ré)initialise les valeurs globales
// - (ré)initialise le timer "refresh_session"
// ###############################
function reset_values() {
    session_id=0;
    session_name="";
    clearInterval(list_defis_int_id);
    clearInterval(list_sessions_int_id);
    list_sessions_int_id = setInterval("refresh_sessions()", 5000);
    refresh_sessions();
}



// ###############################
// sendXHR(args, callback)
// - effectue une requête au serveur avec args en paramètres
// - exécute callback au retour de la requête
// ###############################
function sendXHR(args, callback) {
  let xhr = new XMLHttpRequest() || new window.ActiveXObject("Microsoft.XMLHTTP");
  xhr.open("POST", "defis.php", true);
  xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  xhr.onreadystatechange = function() {
    if (xhr.status === 200 && xhr.readyState === 4) {
      callback(xhr.response); // responseText ?
    } 
  };
  xhr.send(args);
}



// ###############################
// refresh_sessions()
// - récupère la liste des sessions existantes et les place dans la liste déroulante
// ###############################
function refresh_sessions(){
    sendXHR("cmd=get_sessions", function(response) {
        var new_IDs=Array();
        var new_names=Array();
        var old_IDs=Array();
        var old_names=Array();
    
        // Step 1 : get the new sessions from database
        data = JSON.parse(response);
        for(var i in data){
            new_IDs.push(data[i]["id"]);
            new_names.push(data[i]["nom"]);
        }

        // Step 2 : get the old sessions from <select>
        var sel_id = document.getElementById("id_sel_sessions") ;
        for (var i=1; i<sel_id.length; i++) {
            old_IDs.push(sel_id.options[i].value);
            old_names.push(sel_id.options[i].text);
        }
            
        // Step 3 : Remove deleted sessions (rennamed wont work)
        for (var i=sel_id.length -1; i>0; i--) {
            if (new_IDs.indexOf(old_IDs[i-1]) == -1) {
                sel_id.remove(i);
            }                
        }

        // Step 4 : Add new sessions
        for (var i=0; i<new_IDs.length; i++) {
            if (old_IDs.indexOf(new_IDs[i]) == -1) {
                var opt = document.createElement('option');
                opt.value = new_IDs[i];
                opt.innerHTML = new_names[i];
                sel_id.appendChild(opt);
            }
        }
    })
}



// ###############################
// new_session()
// - check le nom de session proposé
// - envoie une requête pour créer la session (et récupère son ID)
// - va sur cette nouvelle session
// - active la possibilité de rajouter des défis
// ###############################
function new_session(){
    session_name = document.getElementById("id_input_sess").value; 

    // Petite série d'anti-cons
    if (session_name == "") { 
        alert("NON : le nom de la session [" + session_name + "] ne peut pas être vide.");
        return ;
    }
    if (session_name.length <8 ) { 
        alert("NON : le nom de la session [" + session_name + "] est trop court (8 caractères minimum).");
        return ;
    }
    if (session_name.length >64) { 
        alert("NON : le nom du défi [" + session_name + "] est trop long (64 caractères maximum).");
        return ;
    }
    if (containsSpecialChars(session_name)) { 
        alert("NON : le nom du défi [" + session_name + "] contient un (ou des) caractères non autorisés.");
        return ;
    }

    // et on bosse enfin
    sendXHR("cmd=new_session&name=" + session_name, function(reponse) {
        session_id = reponse ;
        use_session();
        document.getElementById("id_new_defi").style.display = "";
    })
}



// ###############################
// use_session()
// - stoppe le polling de sessions
// - cache la page d'accueil
// - affiche la table des défis
// - récupère l'ID se session 
// - active le polling de défis
// ###############################
function use_session(){
    clearInterval(list_sessions_int_id);
    document.getElementById("home").style.display = "none";
    document.getElementById("user").style.display = "";
    
    if (session_id==0) {  // Selection par <select>
        var id_session_id = document.getElementById("id_sel_sessions");
        session_id = id_session_id.value ;    
        session_name = id_session_id.options[id_session_id.selectedIndex].text ;
    } else {  // New
        session_name = document.getElementById("id_input_sess").value; 
    }

    document.getElementById("id_h2_sess").innerHTML=session_name;
    list_defis_int_id = setInterval("refresh_defis()", 2500);
    refresh_defis() ;
}



// ###############################
// refresh_defis()
// - récupère les noms, valeurs et goals de chaque défi
// - s'il n'est pas présent dans la table : on le rajoute
// - s'il est présent et que la valeur a changé : on met à jour
// - si la table a été modifiée, on met à jour les totaux
// ###############################
function refresh_defis(){
    sendXHR("cmd=get_defis&id=" + session_id, function(response) {
        data = JSON.parse(response);
        var tab_names=Array();
        var tab_id = document.getElementById("id_tab_defis") ;
        var old_tr = tab_id.getElementsByTagName("tr");
        for (var i=0; i<old_tr.length; i++) {
            tab_names.push(old_tr[i].getElementsByTagName("td")[1].innerHTML);
        }            

        var tot_nb =0 ;
        var tot_goal =0 ;
        var updated=false;
        for(var i in data){
            var nom = data[i]["nom"];
            var nb = Number(data[i]["nb"]);
            var goal = Number(data[i]["goal"]);

            tot_nb += nb;
            tot_goal += goal;

            var classe="gradient_00" ;
            if (nb >= goal) {
                classe="gradient_100" ;
            } else {
                classe="gradient_" + pad( 5 * Math.floor ( (20*nb)/(goal)) ,2) ;  // Arrondi par 5
            }

            var cur_tr ;

            if (tab_names.indexOf(nom) == -1) { // Creation
                cur_tr = tab_id.insertRow() ;       
                cur_tr.insertCell().appendChild(document.createTextNode(""));
                cur_tr.insertCell().appendChild(document.createTextNode(nom));
                cur_tr.insertCell().appendChild(document.createTextNode(nb));
                cur_tr.insertCell().appendChild(document.createTextNode("/"));
                cur_tr.insertCell().appendChild(document.createTextNode(goal));
                var last_td = cur_tr.insertCell() ;
                last_td.appendChild(document.createTextNode(" "));

                var idx = Number(i)+1 ;

                var btn5 = document.createElement("button");
                btn5.innerHTML = '+5';
                btn5.onclick = update_defi.bind(this, idx, 5) ;
                last_td.appendChild(btn5);

                var btn10 = document.createElement("button");
                btn10.innerHTML = '+10';
                btn10.onclick = update_defi.bind(this, idx, 10) ;
                last_td.appendChild(btn10);

                var btn20 = document.createElement("button");
                btn20.innerHTML = '+20';
                btn20.onclick = update_defi.bind(this, idx, 20) ;
                last_td.appendChild(btn20);

                var tmp_td = cur_tr.getElementsByTagName("td");
                tmp_td[1].setAttribute('class', classe + " gauche" + ((nb >= goal)?" td_OK":"") ) ;               
                for (var i_td=2; i_td<5; i_td++) {
                    tmp_td[i_td].setAttribute('class', classe) ;
                }
                updated=true;
            } else {
                // Update
                cur_tr = old_tr[i];
                var old_td = cur_tr.getElementsByTagName("td");
                if (nb != old_td[2].innerHTML){
                    old_td[2].innerHTML = nb;

                    old_td[1].setAttribute('class', classe + ((nb >= goal)?" td_OK":"") ) ;
                    for (var i_td=2; i_td<5; i_td++) {
                        old_td[i_td].setAttribute('class', classe) ;
                    }
                    updated=true;
                }
            }
        }
        if (updated) {
            document.getElementById("tot_nb").innerHTML=tot_nb ;
            document.getElementById("tot_goal").innerHTML=tot_goal ;
        }
    })
}


// ###############################
// update_defi(idx,incr)
// - est appelé quand on clique sur un des boutons +5/+10/+20
// - envoie une requête d'update pour le défi concerné
// ###############################
function update_defi(idx,incr) {
    sendXHR("cmd=update_defi&id=" + session_id + '&idx=' + idx + "&incr=" + incr, function(response) {
    //    alert(response);
    })
}



// ###############################
// new_defi()
// - vérifie le nom et le goal proposé
// - envoie une requète de création du défi
// ###############################
function new_defi(){
    var defi_name = document.getElementById("id_input_defi").value; 
    var defi_goal = document.getElementById("id_input_goal").value;

    // Petite série d'anti-cons
    if (defi_name == "") { 
        alert("NON : le nom du défi [" + defi_name + "] ne peut pas être vide.");
        return ;
    }
    if (defi_name.length <4 ) { 
        alert("NON : le nom du défi [" + defi_name + "] est trop court (4 caractères minimum).");
        return ;
    }
    if (defi_name.length >32) { 
        alert("NON : le nom du défi [" + defi_name + "] est trop long (32 caracteres maximum).");
        return ;
    }
    if (containsSpecialChars(defi_name)) { 
        alert("NON : le nom du défi [" + defi_name + "] contient un (ou des) caractères non autorisés.");
        return ;
    }    
    if ( defi_goal == "") {
        alert("NON : la valeur de goal [" + defi_goal + "] est vide.");
        return ;
    }
    if (isNaN(Number(defi_goal))) {
        alert("NON : la valeur de goal [" + defi_goal + "] doit être un nombre.");    
        return ;
    }
    if(Number(defi_goal) <= 0) {
        alert("NON : la valeur de goal [" + defi_goal + "] doit être strictement positif.");
        return ;
    }
    if(Number(defi_goal) >=10000) {
        alert("NON : la valeur de goal [" + defi_goal + "] doit être inférieur à 10 000.");
        return ;
    }
    if (Number(defi_goal) % 1 != 0) {
        alert("NON : la valeur de goal [" + defi_goal + "] doit être un entier.");    
        return ;
    }

    // et on bosse enfin
    sendXHR("cmd=new_defi&id=" + session_id + '&name=' + defi_name + "&incr=" + defi_goal, function(response) {
        if (response!=""){
            document.getElementById("id_input_defi").value=""; 
            document.getElementById("id_input_goal").value=""; 
        } else {
            alert("Euh... : Déso, on n'a pas pu créer ce défi.");
        }                   
    })
}

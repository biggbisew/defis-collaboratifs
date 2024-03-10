var list_sessions_int_id=0;
var list_defis_int_id = 0;
var session_id = 0 ;
var session_name = "" ;

function reset_values() {
    session_id=0;
    session_name="";
    clearInterval(list_defis_int_id);
    clearInterval(list_sessions_int_id);
    list_sessions_int_id = setInterval("refresh_sessions()", 5000);
    refresh_sessions();
}



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


function update_defi(idx,incr) {
    sendXHR("cmd=update_defi&id=" + session_id + '&idx=' + idx + "&incr=" + incr, function(response) {
    //    alert(response);
    })
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

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
                tmp_td[1].setAttribute('class', classe + ((nb >= goal)?" td_OK":"") ) ;               
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


function new_session(){
    session_name = document.getElementById("id_input_sess").value; 
    if (session_name != "") {
        sendXHR("cmd=new_session&name=" + session_name, function(reponse) {
            session_id = reponse ;
            use_session();
            document.getElementById("id_new_defi").style.display = "";
        })
    }
}


function new_defi(){
    var defi_name = document.getElementById("id_input_defi").value; 
    var defi_goal = document.getElementById("id_input_goal").value; 
    if ((defi_name != "") && (defi_goal != "")) {
        sendXHR("cmd=new_defi&id=" + session_id + '&name=' + defi_name + "&incr=" + defi_goal, function(response) {
            if (response!=""){
                document.getElementById("id_input_defi").value=""; 
                document.getElementById("id_input_goal").value=""; 
            }
        })
    }
}

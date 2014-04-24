function On_PluginInit() { 
    try {
        if (!Plugin.IniExists("cfg_Core")) {
            Plugin.CreateIni("cfg_Core");
            var iniConf = Plugin.GetIni("cfg_Core");
			iniConf.AddSetting("ServerInfo", "server", "http://rustard.com");
			iniConf.AddSetting("ServerInfo", "serverID", 0); 
            iniConf.AddSetting("ServerInfo", "serverPass", "");
            iniConf.AddSetting("ServerInfo", "serverScript", "logger");

            iniConf.AddSetting("Settings", "replaceRock", true);
            iniConf.AddSetting("Settings", "defaultWeapon", "Stone Hatchet");

            iniConf.Save();
        }
        
    } catch (err) {
        Plugin.Log("Error_log", "Error Message: " + err.message + " in On_PluginInit");
        Plugin.Log("Error_log", "Error Description: " + err.description + " in On_PluginInit")
    }
}

function On_ServerInit() { 
	Server.server_message_name = "Rustard"; 
}

// support functions:

function sendData (data, method) {
	var iniConf = Plugin.GetIni("cfg_Core");
    var server = iniConf.GetSetting("ServerInfo", "server");
    var serverID = iniConf.GetSetting("ServerInfo", "serverID");
    var serverPass = iniConf.GetSetting("ServerInfo", "serverPass");
    var serverScript = iniConf.GetSetting("ServerInfo", "serverScript");

    var chunk = "";
    for (var x in data) {
		 var key = x;
		 var value = data[x];
		 chunk = chunk + "&" + key + "=" + value;
	}

	if(method == true){
		var url= server + "/" + serverScript + "?serverID=" + serverID + "&pass=" + serverPass + chunk;
		var request = Web.GET(url);
	} else {
		// default method it POST
		var url= server + "/" + serverScript;
		var chunk = "serverID=" + serverID + "&pass=" + serverPass + chunk;
		var request = Web.POST(url, chunk);
	}
	
	return eval("(function(){return " + request + ";})()");
}

function locator(Player) {
	try{
		var data = {};
		data['action'] = "loc";
		data['sid'] = Player.SteamID;
		
		var posx = parseInt(Player.X);
		var posy = parseInt(Player.Y);
		var posz = parseInt(Player.Z);

		data['position'] = posx+"|"+posy+"|"+posz;

		var response = {};
		response = sendData(data);
		
		var yaw = direcction(getAngle(Player.PlayerClient.controllable.idMain.eyesYaw));
		return "You are facing " + yaw;
		
	} catch(err){
		Server.Broadcast("Error Message: " + err.message);
		Server.Broadcast("Error Description: " + err.description);
	}
}

function direcction(dir) {
    if ((dir > 337.5) || (dir < 22.5)) {
        return "North";
    } else if ((dir >= 22.5) && (dir <= 67.5)) {
        return "Northeast";
    } else if ((dir > 67.5) && (dir < 112.5)) {
        return "East";
    } else if ((dir >= 112.5) && (dir <= 157.5)) {
        return "Southeast";
    } else if ((dir > 157.5) && (dir < 202.5)) {
        return "South";
    } else if ((dir >= 202.5) && (dir <= 247.5)) {
        return "Southwest";
    } else if ((dir >247.5) && (dir < 292.5)) {
        return "West";
    } else if ((dir >= 292.5) && (dir <= 337.5)) {
        return "Northwest";
    }
}

function getAngle(angle) {
    if (angle < 0 ) {
        angle += 360;
    }
    return angle;
}

// main plugin stuff:

function On_PlayerConnected(Player){
	// Set some defaults on player connect:
		Player.SendCommand("censor.nudity False");
		Player.SendCommand("grass.on False");
		Player.SendCommand("gui.hide_branding False");

	// log connection status to website:
		var name = Player.Name;
		var sid = Player.SteamID;
		var ip = Player.IP;
		var url= server+"/"+serverScript+"?serverID="+serverID+"&pass="+serverPass+"&action=connect&sid="+sid+"&name="+name+"&ip="+ip;
		var request = Web.GET(url);

	// just saving this json junk for later:
	//var response = eval("(function(){return " + strJSON + ";})()");
	//Player.Message(response.message);
}

function On_PlayerDisconnected(Player){	
	// log Disconnect to website
		//locator(Player, false);
		var sid = Player.SteamID;
		var url= server+"/"+serverScript+"?serverID="+serverID+"&pass="+serverPass+"&action=disconnect&sid="+sid;
		var request = Web.GET(url);
}

function On_PlayerSpawned(Player, spawnEvent) {
	
	// replace rock with default weapon
		var replaceRock = Data.GetConfigValue(config, "Settings", "replaceRock");
	    
	    if (replaceRock == "true") {
	    	var defaultWeapon = Data.GetConfigValue(config, "Settings", "defaultWeapon");

	        if (spawnEvent.FreshSpawn) {
	            Player.Inventory.RemoveItemAll("Rock");
	            Player.Inventory.AddItemTo(defaultWeapon, 30, 1);
	        }

	        if (!spawnEvent.FreshSpawn) {
	            if (Player.Inventory.HasItem("Rock")) {
	                Player.Inventory.RemoveItemAll("Rock");
	            }
	        }

	        if (!((Player.Inventory.HasItem("Stone Hatchet")) || (Player.Inventory.HasItem("Hatchet")) || (Player.Inventory.HasItem("Pick Axe")))) {
	            Player.Inventory.AddItemTo(defaultWeapon, 30, 1);
	        }
	    }

	// record spawn position
		locator(Player, false); 
}

function On_PlayerHurt(he) {

    //Server.Broadcast(he.DamageType + " " + he.Victim.Health);
    //Server.Broadcast(he.DamageEvent.status);

    // if attacker is not victim then sent message to attacker telling them how much damage they did.
}

function On_PlayerKilled(DeathEvent) {
	
	var attId = String(DeathEvent.DamageEvent.attacker.id);
	var attIdMain = String(DeathEvent.DamageEvent.attacker.idMain);

	// Determin if its murder:
	if(attIdMain.indexOf(DeathEvent.Victim.SteamID, 0) >= 0){
		var murder = false;
	} else if(attIdMain.indexOf("player_soldier", 0) >= 0){
		var murder = true;
	} else {
		var murder = false;
	}
	
	// Determine COD and death category:
	var cod = "unknown";
	var deathtype = "unknown";

	if(attIdMain.indexOf('DeployableObject', 0) >= 0){

        if(attIdMain.indexOf('LargeWoodSpikeWall', 0) >= 0){
        	deathtype = "item";
        	cod = "some large spikes";
        } else if(attIdMain.indexOf('WoodSpikeWall', 0) >= 0){
        	deathtype = "item";
        	cod = "a spike wall";
        } else if(attIdMain.indexOf('ExplosiveCharge', 0) >= 0){
        	deathtype = "explosives";
        	cod = "C4";
        }

    } else if(attId.indexOf('TimedGrenade', 0) >= 0){

    	deathtype = "explosives";
    	cod = "a grenade";

    } else if(attIdMain.indexOf('Wolf', 0) >= 0 || attIdMain.indexOf('Bear', 0) >= 0){

    	deathtype = "ai";

    	if(attIdMain.indexOf('MutantWolf', 0) >= 0){
        	cod = "a mutant wolf";
        } else if(attIdMain.indexOf('MutantBear', 0) >= 0){
        	cod = "a mutant bear";
        } else if(attIdMain.indexOf('Wolf', 0) >= 0){
        	cod = "a wolf";
        } else if(attIdMain.indexOf('Bear', 0) >= 0){
        	cod = "a bear";
        }

    } else if(attId.indexOf('Metabolism', 0) >= 0){

    	deathtype = "environmental";
    	if(DeathEvent.DamageAmount < 1){
    		cod = "starvation";
    	} else {
    		cod = "radiation poisoning";
    	}

    } else if(DeathEvent.Attacker.SteamID == DeathEvent.Victim.SteamID && DeathEvent.DamageAmount == 'Infinity'){
    	deathtype = "manual";
    	cod = "suicide";
    } else {

    	if(DeathEvent.Victim.IsInjured == true){
    		deathtype = "environmental";
    		cod = 'a nasty fall';
    	} else if(DeathEvent.DamageAmount >= 15){
    		deathtype = "water";
    		cod = 'drowned';
    	} else {
    		cod = "bled out";
    	}

    }

    //Server.Broadcast("COD: " + cod);

    var victim = DeathEvent.Victim.Name;

    if(murder == true){

    	var killer = DeathEvent.Attacker.Name;
		Server.Broadcast(killer + " just killed " + victim);

    } else {
    	switch(deathtype){

    		case "item":
    			Server.Broadcast(victim + " just was gutted by " + cod + "!");
    		break;

    		case "explosives":
    			Server.Broadcast(victim + " just blew himself up with " + cod + "!");
    		break;

    		case "ai":
    			Server.Broadcast(victim + " just got jacked up by " + cod + "!");
    		break;

    		case "environmental":
    			Server.Broadcast(victim + " died from " + cod + "!");
    		break;

    		case "manual":
    			Server.Broadcast(victim + " has died from autoerotic asphyxiation!");
    		break;

    		case "water":
    			Server.Broadcast(victim + " should have taken swimming lessons.");
    		break;

    		default:
    			Server.Broadcast(victim + " has died under mysterious circumstances.");
    		break;

    	}
    }

    /*
	if(DeathEvent.Victim != null && DeathEvent.Attacker != null && DeathEvent.Attacker != "undefined" && DeathEvent.Victim != "undefined" ){
		// we have both a killer and a victim

		if(DeathEvent.Attacker.SteamID == DeathEvent.Victim.SteamID){
			//is a suicide
			if(DeathEvent.DamageType == "Melee"){
				Server.Broadcast(DeathEvent.Attacker.Name + " just gutted himself on a spike.");
			} else if(DeathEvent.DamageType == "Explosion") {
				Server.Broadcast(DeathEvent.Attacker.Name + " just blew himself up.");
			} else {
				Server.Broadcast(DeathEvent.Attacker.Name + " just killed himself.");
			}
		} else {
			// not a suicide
		
			var killer = DeathEvent.Attacker.Name;
			var victim = DeathEvent.Victim.Name;
			
			Server.Broadcast(killer + " just killed " + victim);
		}
	}
	*/
}

function On_NPCKilled(DeathEvent) {

	var attacker = DeathEvent.Attacker.Name;
	var attackerSid = DeathEvent.Attacker.SteamID;
	var attackerPos = DeathEvent.Attacker.X+"|"+DeathEvent.Attacker.Y+"|"+DeathEvent.Attacker.Z;

	if(DeathEvent.DamageType == "Melee" && DeathEvent.WeaponName == undefined){
		var weapon = "Hunting Bow";
	} else if(DeathEvent.DamageType == "Explosion" && DeathEvent.WeaponName == undefined) {
		var weapon = "Explosives";
	} else {
		var weapon = DeathEvent.WeaponName;
	}

	var victim = DeathEvent.Victim.Name;
	var victimPos = DeathEvent.Victim.X+"|"+DeathEvent.Victim.Y+"|"+DeathEvent.Victim.Z;

	DeathEvent.Attacker.Message(victim+ " @ " +victimPos);

	DeathEvent.Attacker.Message("Attacker: " + DeathEvent.Attacker.Name);
	DeathEvent.Attacker.Message("DamageType: " + DeathEvent.DamageType);
	DeathEvent.Attacker.Message("Entity: " + DeathEvent.Entity.Name);
	DeathEvent.Attacker.Message("Victim: " + DeathEvent.Victim.Name);
}

function On_Command(Player, cmd, args) { 

	cmd = Data.ToLower(cmd);
	switch(cmd) {
	
		case "test":

			Player.Message("time: "+ System.DateTime.Now.ToString("yyyy-mm-dd hh:mm:ss"));
			var time = System.DateTime.Now.toString("hh:mm tt");
			Player.Message("Server time is " + time);

		break;

		case "plist":

			for(var Players in Server.Players) {
				Server.Broadcast("P: " + Players.Name);
			}

		break;

		case "now":
			var gametime = World.Time;
			var hour = Math.floor(gametime);
			var tmp = gametime % 1;
			var min = Math.floor(tmp * 60);
			var players = Server.Players;
			if (hour > 0) {			
				Player.Message("◆ Rust Time : " + hour +" h "+ min +" m  ◆ Ping : " + Player.Ping);			
				Player.Message("◆ Play Time : " + parseInt(Player.TimeOnline / 60000) + " min  ◆ Players : " + players.Count +" ♟");
			}
		break;

		case "drop":
				
			try{

				
				if(args.Length < 2){
					Player.Message("usage is '/animal # type player");
					break;
				}

				var count = args[0];
				var type = args[1];

				if(args.Length < 3){
					var targetPlayer = Player;
				} else {
					var target = args[2];
					var targetPlayer = Magma.Player.FindByName(target);
				}

				switch(type){
					case "wolf":
						var animal = ':wolf_prefab';
					break;

					case "bear":
						var animal = ':bear_prefab';

					break;

					case "mbear":
						var animal = ':mutant_bear';
					break;

					case "mwolf":
						var animal = ':mutant_wolf';
					break;

					case "c4":
						var animal = ';explosive_charge';
					break;

					default:
						var animal = false;
					break;
				}
				var i = 1;
				while(i<=count){
					World.Spawn(animal, targetPlayer.X, targetPlayer.Y, targetPlayer.Z);
					i++;
				}
			} catch(err){
				Server.Broadcast("Error Message: " + err.message);
				Server.Broadcast("Error Description: " + err.description);
			}

		break

		case "location":
			Player.Message(locator(Player));
		break;

		
    }
}
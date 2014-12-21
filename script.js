// Code goes here

var MartialSim = angular.module( 'MartialSim', ['ngSanitize']);

MartialSim.controller('MartialSimEditor', ['$scope','$location', function($scope,$location) {
  
  $scope.attributes = [
    { id: 'name', title: "Name", format: "\\w[\\w ]+", save_offset:0, type: 'text' },
    { id: 'hp', title: "HP", format: "\\d+", save_offset:1, type: 'number' },
    { id: 'str', title: "Str", format: "\\d{1,2}", save_offset:2, type: 'number' },
    { id: 'dex', title: "Dex", format: "\\d{1,2}", save_offset:3, type: 'number'},
    { id: 'con', title: "Con", format: "\\d{1,2}", save_offset:4, type: 'number' },
    { id: 'bab', title: "BAB", format: "\\d{1,2}(/\\d{1,2})*", save_offset:5, type: 'text'  },
    { id: 'chit', title: "+hit", format: "\\d{1,2}", save_offset:6, type: 'number' },
    { id: 'threat', title: "Threat", format: "(\\d{1,2}-){0,1}20x\\d", save_offset:7, type: 'text' },
    { id: 'dmgd', title: "Dmg dice", format: "\\d{1,2}d\\d{1,2}", save_offset:8, type: 'text'  },
    { id: 'dmgv', title: "Dmg Val", format: "\\d{1,2}", save_offset:9, type: 'number' },
    { id: 'ac', title: "AC", format: "\\d{1,2}", save_offset:10, type: 'number' },
    { id: 'init', title: "Init", format: "-?\\d{1,2}", save_offset:11, type: 'number' },
  ];
  
  $scope.derrived_attributes = [
    { id: '$con_mod', title: "Con Mod" },
    { id: '$dex_mod', title: "Dex Mod" },
    { id: '$str_mod', title: "Str Mod" },
    { id: '$attacks', title: "Attacks" },
    { id: '$ac_ff', title: "Flat Footed" },
    { id: '$threat_range', title: "Threat Range" },
    { id: '$damage_dice', title: "Damage Dice" },
  ];
  
  $scope.characters = [
    { name:'Fighty the L4 Fighter',
      hp: 33,
      str: 16,
      dex: 13,
      con: 14,
      bab: 4,
      chit: 5,
      threat: '19-20x2',
      dmgd: '1d8',
      dmgv: 5,
      ac: 17,
      init: 1,
    },
    { name:'Zappy the L20 Mage',
      hp: 62,
      str: 10,
      dex: 14,
      con: 13,
      bab: "10/5",
      chit: 1,
      threat: '20x2',
      dmgd: '1d6',
      dmgv: 0,
      ac: 12,
      init: 1,
    }
  ];
  
  $scope.fightCount = 1;
  
  $scope.combatLog = "";
  $scope.log = function(){
    if($scope.disableLog) return; 
    $scope.combatLog += Array.prototype.slice.call(arguments).join(' ')+"<br>";
  }
  
  $scope.save = function(){
    var saveObject = [];
    for(var i in $scope.characters){
      saveObject[i] = [];
      for(var j in $scope.attributes){
        saveObject[i][$scope.attributes[j].save_offset] = $scope.characters[i][$scope.attributes[j].id];
      }
    }
    $scope.saveString = JSON.stringify(saveObject);
  };
  
  $scope.load = function(){
    var saveObject = JSON.parse($scope.saveString);
    for(var i in $scope.characters){
      for(var j in $scope.attributes){
        $scope.characters[i][$scope.attributes[j].id] = saveObject[i][$scope.attributes[j].save_offset];
      }
    }
    $scope.reset();
  };
  
  
  $scope.round_toward_zero = function(n){
    if(n<0) return Math.ceil(n);
    else return Math.floor(n);
  };
  
  $scope.randomInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };
  
  $scope.calculateDerrivedStats = function(){
    for(var i in $scope.characters){
      var c = $scope.characters[i];
      
      //calculate stat mods
      c.$con_mod = $scope.round_toward_zero( (c.con-10)/2 );
      c.$dex_mod = $scope.round_toward_zero( (c.dex-10)/2 );
      c.$str_mod = $scope.round_toward_zero( (c.str-10)/2 );
      
      c.$ac_ff = c.ac-c.$dex_mod;
      
      
      var attacks = String(c.bab)
          .split("/")
          .map(function(n){
            return Number(n)+c.chit;
          });
      c.$attacks = attacks;
      
      var threat = c.threat.split(/[-x]/).map(Number);
      if(threat.length === 2) threat.unshift(20);
      c.$threat_range = threat;
      
      var damage = c.dmgd.split(/[d]/).map(Number);
      c.$damage_dice = damage;
      
    }
    
  };
  $scope.calculateDerrivedStats();
  
  //recalculate derrived stats every time character data changes
  $scope.$watch("characters",$scope.calculateDerrivedStats,true);
  
  $scope.fights = 0;
  $scope.stats = [];
  

  
  $scope.attack = function(c,e,max_attacks,allow_fumbles) {

    
    $scope.log(c.name,"is attacking",e.name);
    if(e.$flat_footed){
      $scope.log("\tand",e.name,"is flat footed");
    }
    
    var defending_ac = e.ac;
    if(e.$flat_footed) defending_ac = e.$ac_ff;
    
    for(var i in c.$attacks){
      if(i == max_attacks) break;
      
      var roll = $scope.randomInt(1,20);
      var hit = roll + c.$attacks[i];
      $scope.log(c.name,"rolls a",roll,": ",hit," vrs ",defending_ac+" AC");
      
      //critical fumble
      if(roll === 1){ 
        if(allow_fumbles){
          c.$flat_footed = true;
          $scope.log(c.name,"critically fails");
          //1 opportunity attack at highest BAB
          $scope.attack(e,c,1,false); 
          if(c.$hp<0) return;
        }
        return; //end attacks, we fumbled
      } //end fumble
	  
	  //miss!
	  if( hit<defending_ac && roll != 20){
		$scope.log(c.name,"misses",e.name,"!");
		continue;
	  }
      
      //threat
      var multiplier = 1;
      if(roll >= c.$threat_range[0] && roll <= c.$threat_range[1]){
        var confirm_roll = $scope.randomInt(1,20);
        var confirm_hit = confirm_roll + c.$attacks[i];
        $scope.log(c.name," rolls threat! Roll to confirm:",confirm_roll,": ",confirm_hit," vrs ",defending_ac+" AC");
        if(confirm_hit >= defending_ac) multiplier = c.$threat_range[2];
      }
      
      var damage = c.dmgv;
      
      //for each damage dice you get
      for(var j=0;j<c.$damage_dice[0];j++){
        var roll = $scope.randomInt(1,c.$damage_dice[1]);
        $scope.log(c.name," rolls a d",c.$damage_dice[1],":",roll);
        damage += roll;
      }
      
      damage *= multiplier;
      e.$hp -= damage;
      
      $scope.log(e.name,"takes",damage,":",e.$hp,"/",e.hp);
 
      if(e.$hp<0) return;
    }
    
  }; //end attack
  
  $scope.fight = function(){
    $scope.fights++;
    
    $scope.log("<b>New Fight</b>");
    //reset characters to pre-battle state
    for(var i in $scope.characters){
      $scope.characters[i].$hp = $scope.characters[i].hp;
      $scope.characters[i].$flat_footed = true;
      $scope.characters[i].$id = i;
    }
    
    //roll initiative
    do{
      for(i in $scope.characters){
        var c = $scope.characters[i];
        c.$init_roll = $scope.randomInt(1,20) + c.init;
        $scope.log(c.name + " rolls " + c.$init_roll + " initiative");
      }
    }while( $scope.characters[0].$init_roll == $scope.characters[1].$init_roll );
    
    //shallow copy of character array to store turn order
    var order = angular.copy($scope.characters);
    order.sort(function(a,b){
      return b.$init_roll-a.$init_roll;
    });
    $scope.log(order[0].name+" goes first!");
    
    for(var round = 0; round < 1000; round++){
      $scope.log("<i>Round ",round,"</i>");
      for(i in order){
        var current = order[i]; //current entity
        var enemy = order[1-i]; //get enemy entity
        
        current.$flat_footed = false;
        
        $scope.attack(current,enemy,current.$attacks.length,true);
        
        if(current.$hp < 0){
          $scope.log(enemy.name,"wins!");
          if(!$scope.characters[enemy.$id].$wins){
            $scope.characters[enemy.$id].$wins=0;
          }
          $scope.characters[enemy.$id].$wins++;
          return enemy.$id;
        }
        if(enemy.$hp < 0){
          $scope.log(current.name,"wins!");
          if(!$scope.characters[current.$id].$wins){
            $scope.characters[current.$id].$wins=0;
          }
          $scope.characters[current.$id].$wins++;
          return current.$id;
        }
      }  //end initiative order
    } //end round
  }; //end fight
 
  $scope.fightNTimes = function(){
	$scope.combatLog = "";
    console.time("fight "+$scope.fightCount+" times");
    for(var i=0;i<$scope.fightCount;i++){
	  if(i>=10) $scope.disableLog = true;
      $scope.fight();
    }
	if(i>=10) $scope.disableLog = false;
    console.timeEnd("fight "+$scope.fightCount+" times");
  };
  
  
  $scope.reset = function(){
    $scope.fights = 0;
    for(var i in $scope.characters){
      $scope.characters[i].$wins = 0;
    }
	$scope.combatLog = "";
  }


}]);
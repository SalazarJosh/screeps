module.exports = {
  // a function to run the logic for this role
  /** @param {Creep} creep */
  run: function(creep) {
    // if target is defined and creep is not in target room
    if (creep.memory.target != undefined &&
      creep.room.name != creep.memory.target &&
      creep.memory.working == false) {
      if (creep.ticksToLive > 120) {
        creep.travelTo(new RoomPosition(25, 25, creep.memory.target));
        return;
      } else {
        creep.suicide();
      }
    }
    // if creep is bringing energy to a structure but has no energy left
    if (creep.memory.working == true && _.sum(creep.carry) == 0) {
      // switch state
      creep.memory.working = false;
    }
    // if creep is picking up but is full
    else if (creep.memory.working == false && _.sum(creep.carry) == creep.carryCapacity) {
      // switch state
      creep.memory.working = true;
    }

    // if creep is supposed to transfer energy to a structure
    if (creep.memory.working == true) {
      // if in home room
      if (creep.room.name == creep.memory.home) {
        // if(creep.store[0].resourceType == RESOURCE_ENERGY &&
        //   creep.room.energyAvailable < creep.room.energyCapacityAvailable){
        //     creep.depositEnergy();
        // }

        var terminal = creep.room.terminal;
        if (terminal != null) {
          if (_.sum(creep.carry) < terminal.storeCapacity - _.sum(terminal.store)) {
            if (creep.transfer(terminal, _.findKey(creep.carry)) == ERR_NOT_IN_RANGE) {
              // move towards it
              creep.travelTo(terminal);
            }
          } else {
            var storage = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
              filter: s => (s.structureType == STRUCTURE_STORAGE)
            });
            if (storage != null) {
              if (_.sum(creep.carry) < storage.storeCapacity - _.sum(storage.store)) {
                if (creep.transfer(storage, _.findKey(creep.carry)) == ERR_NOT_IN_RANGE) {
                  // move towards it
                  creep.travelTo(storage);
                }
              }
            }
          }
        }
      }

      // if not in target room
      else {
        creep.travelTo(new RoomPosition(25, 25, creep.memory.home));
      }
    }

    // if creep is supposed to collect
    else {
      // if creep is in target room
      if (creep.room.name == creep.memory.target) {
        var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
          filter: (structure) => (structure.structureType == STRUCTURE_CONTAINER ||
              structure.structureType == STRUCTURE_LAB ||
              structure.structureType == STRUCTURE_EXTENSION ||
              structure.structureType == STRUCTURE_LINK ||
              structure.structureType == STRUCTURE_NUKER ||
              structure.structureType == STRUCTURE_TOWER ||
              structure.structureType == STRUCTURE_SPAWN ||
              structure.structureType == STRUCTURE_STORAGE ||
              structure.structureType == STRUCTURE_TERMINAL) &&
            _.sum(structure.store) > 0
        });
        if (target != undefined) {
          // get whatever resource is first in the storage
          if (creep.withdraw(target, _.findKey(target.store)) == ERR_NOT_IN_RANGE) {
            // move towards it
            creep.travelTo(target);
          }
        }
      }

    }
  }
};

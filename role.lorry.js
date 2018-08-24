module.exports = {
  // a function to run the logic for this role
  /** @param {Creep} creep */
  run: function(creep) {
    // if creep is bringing energy to a structure but has no energy left
    if (creep.memory.working == true && _.sum(creep.carry) == 0) {
      // switch state
      creep.memory.working = false;
    }
    // if creep is collecting energy but is full
    else if (creep.memory.working == false &&
      creep.carry.energy == creep.carryCapacity ||
      _.sum(creep.carry) == creep.carryCapacity) {
      // switch state
      creep.memory.working = true;
      creep.memory.targetContainer = undefined;
    }

    // if creep is supposed to transfer to a structure
    if (creep.memory.working == true) {
      var enemyCreeps = creep.room.find(FIND_HOSTILE_CREEPS);
      var structure;

      if (enemyCreeps.length > 1) {
        var structures = creep.room.find(FIND_MY_STRUCTURES, {
          filter: (s) => (s.structureType == STRUCTURE_TOWER)
        });
        structure = _.min(structures, 'energy');
      }

      // find closest spawn or extension which is not full
      if (structure == undefined) {
        structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
          filter: (s) => (s.structureType == STRUCTURE_SPAWN ||
              s.structureType == STRUCTURE_EXTENSION) &&
            s.energy < s.energyCapacity
        });
      }

      // put energy in nuker if there is one
      if (structure == undefined) {
        structure = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
          filter: (s) => s.structureType == STRUCTURE_NUKER &&
            s.energy < s.energyCapacity
        });
      }

      // find a tower if there aren't any spawns or extensions
      if (structure == undefined) {
        var structures = creep.room.find(FIND_MY_STRUCTURES, {
          filter: (s) => (s.structureType == STRUCTURE_TOWER) &&
            s.energy < s.energyCapacity * .66
        });
        if (structures.length > 0) {
          structure = _.min(structures, 'energy');
        }
      }

      // look for the terminal if it has less than 100k energy
      if (structure == undefined && creep.room.terminal != undefined) {
        structure = creep.room.terminal;
        if (structure.store[RESOURCE_ENERGY] >= 100000) {
          structure = undefined;
        }
      }
      // if there is nothing else to put energy in, put it in storage
      if (structure == undefined && creep.room.storage != undefined) {
        structure = creep.room.storage;
      }

      // if we found something to put it in
      if (structure != undefined) {
        // try to transfer energy, if it is not in range
        for (const resourceType in creep.carry) {
          if (creep.transfer(structure, resourceType) == ERR_NOT_IN_RANGE) {
            creep.travelTo(structure);
          }
        }
      }
    }

    // if creep is supposed to get energy
    else {
      var controllerContainer;
      // if there is a targetContainer in memory, we need get the object again
      // to update the store values and make sure there's energy in it.
      if(creep.memory.targetContainer != undefined){
        creep.memory.targetContainer = Game.getObjectById(creep.memory.targetContainer.id);
        if(creep.memory.targetContainer.structureType == 'link'){
          if(creep.memory.targetContainer.energy == 0){
            creep.memory.targetContainer = undefined;
          }
        }
        else{
          if(creep.memory.targetContainer.store[RESOURCE_ENERGY] == 0){
            creep.memory.targetContainer = undefined;
          }
        }
      }
      // get energy from storage first if the storage has enough energy AND if
      // the room needs energy. We don't want to keep withdrawing from Storage
      // if the room doesn't need energy.
      if (creep.room.storage != undefined) {
        if (creep.room.storage.store[RESOURCE_ENERGY] &&
          creep.room.energyAvailable < creep.room.energyCapacityAvailable) {
          creep.memory.targetContainer = creep.room.storage;
        }
      }

      // if there is nothing in storage, get energy from link by storage
      if (creep.memory.targetContainer == undefined) {
        // look for link by storage
        var links = _.filter(creep.room.find(FIND_STRUCTURES), s => s.structureType == STRUCTURE_LINK);

        // for each link in the room
        for (let link of links) {
          let isStorageLink = link.pos.findInRange(FIND_STRUCTURES, 2, {
            filter: s => s.structureType == STRUCTURE_STORAGE
          })[0];
          if (isStorageLink != undefined && link.energy > 0) {
            creep.memory.targetContainer = link;
          }
        }
      }

      // if there is nothing in storage or if there is nothing in the link,
      // get energy from a container that isn't by the controller
      if (creep.memory.targetContainer == undefined) {
        // look for container by controller
        containerController = creep.room.controller.pos.findInRange(FIND_STRUCTURES, 3, {
          filter: s => s.structureType == STRUCTURE_CONTAINER
        })[0];

        // if there isn't a container by the controller, look for nearest container
        // get all containers in the room
        var roomContainers = creep.room.find(FIND_STRUCTURES, {
          filter: (s) => s.structureType == STRUCTURE_CONTAINER &&
            s.store[RESOURCE_ENERGY] > 0
        });

        var allContainer = [];
        // Calculate the percentage of energy in each container.
        for (var i = 0; i < roomContainers.length; i++) {
          // if the container is by the controller, remove it from the list
          // we don't want to pull energy from that container.
          if (roomContainers[i].id == containerController.id )
          {
            _.pull(roomContainers, roomContainers[i]);
          } else {
            allContainer.push({
              energyPercent: ((roomContainers[i].store.energy / roomContainers[i].storeCapacity) * 100),
              id: roomContainers[i].id
            });
          }
        }
        // Get the container containing the most energy.
        var highestContainer = _.max(allContainer, function(container) {
          return container.energyPercent;
        });
        creep.memory.targetContainer = Game.getObjectById(highestContainer.id);
      }

      // if the creep has a target contaienr
      if (creep.memory.targetContainer != undefined) {
        var container = Game.getObjectById(creep.memory.targetContainer.id);
        creep.memory.linksByMiner = container.pos.findInRange(FIND_STRUCTURES, 1, {
          filter: s => s.structureType == STRUCTURE_LINK
        });

        // try to withdraw energy, if the container is not in range
        if (creep.withdraw(container, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
          // move towards it
          creep.travelTo(container);
        }
      }
      if (creep.memory.targetContainer == undefined && _.sum(creep.carry) > 0) {
        creep.memory.working == true;
      }
    }
  }
};

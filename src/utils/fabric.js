let fabricPromise;

export function loadFabric() {
    fabricPromise ||= import('fabric').then(fabric => {
        fabric.FabricObject.ownDefaults.originX = 'left';
        fabric.FabricObject.ownDefaults.originY = 'top';
        return fabric;
    });
    return fabricPromise;
}

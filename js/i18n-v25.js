/* KeepGoing — textos de la v1.25: arreglos del chat, de «Ver la app como» y de la tienda, ahorro de los planes (ES / EN). */
(function () {
  const es = {
    back: 'Volver', tfSeeMore: 'Ver más', tfEditDay: 'Editar el día',
    stViewBanner: 'Viendo la app como {plan}', stViewBack: 'Volver a mi plan real',
    plSaveYear: 'Ahorras {a} ({n} %) frente a 12 meses', plSaveForever: 'Ahorras {a} ({n} %) frente a {y} años del anual',
    shopTitle: 'Usuario KeepGoing', shopBack: 'Volver a KeepGoing',
    hProjects: 'Proyectos', hProjectsHint: 'Toca para meterlo o sacarlo de un proyecto.',
    hMove: 'Mover a un proyecto', hMoveTitle: 'Mover «{name}»', hMoveHere: 'ya está aquí', hMoveNone: 'No tienes otros proyectos.',
    folderNewHabit: 'Nuevo hábito aquí', hMoveOut: 'Sacar de este proyecto', hMoveOutAll: 'Sacar de todos los proyectos'
  };
  const en = {
    back: 'Back', tfSeeMore: 'See more', tfEditDay: 'Edit day',
    stViewBanner: 'Viewing the app as {plan}', stViewBack: 'Back to my real plan',
    plSaveYear: 'You save {a} ({n}%) compared with 12 months', plSaveForever: 'You save {a} ({n}%) compared with {y} years of yearly',
    shopTitle: 'KeepGoing User', shopBack: 'Back to KeepGoing',
    hProjects: 'Projects', hProjectsHint: 'Tap to add it to or remove it from a project.',
    hMove: 'Move to a project', hMoveTitle: 'Move “{name}”', hMoveHere: 'already here', hMoveNone: 'You have no other projects.',
    folderNewHabit: 'New habit here', hMoveOut: 'Remove from this project', hMoveOutAll: 'Remove from every project'
  };
  Object.assign(window.I18N.es, es);
  Object.assign(window.I18N.en, en);
})();

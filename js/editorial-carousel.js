(function(){
  'use strict';

  function init(){
    var root=document.querySelector('[data-editorial-carousel]');
    if(!root)return;
    var track=root.querySelector('.editorial-track');
    var slides=Array.prototype.slice.call(root.querySelectorAll('.editorial-slide'));
    var previous=root.querySelector('[data-editorial-prev]');
    var next=root.querySelector('[data-editorial-next]');
    var status=root.querySelector('[data-editorial-status]');
    var progress=root.querySelector('[data-editorial-progress]');
    var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current=0;
    var timer=null;

    function pad(value){return String(value).padStart(2,'0');}
    function pause(){if(timer){window.clearInterval(timer);timer=null;}}
    function start(){
      pause();
      if(!reduced&&slides.length>1&&!document.hidden){timer=window.setInterval(function(){show(current+1);},6500);}
    }
    function show(index){
      current=(index+slides.length)%slides.length;
      track.style.transform='translate3d(-'+(current*100)+'%,0,0)';
      status.textContent=pad(current+1)+' / '+pad(slides.length);
      progress.style.transform='translateX('+(current*100)+'%)';
      slides.forEach(function(slide,i){
        slide.setAttribute('aria-hidden',i===current?'false':'true');
        slide.querySelectorAll('a,button').forEach(function(control){control.tabIndex=i===current?0:-1;});
        slide.querySelectorAll('video').forEach(function(video){
          if(i===current){var promise=video.play();if(promise&&promise.catch)promise.catch(function(){});}else{video.pause();}
        });
      });
    }

    previous.addEventListener('click',function(){show(current-1);start();});
    next.addEventListener('click',function(){show(current+1);start();});
    root.addEventListener('mouseenter',pause);
    root.addEventListener('mouseleave',start);
    root.addEventListener('focusin',pause);
    root.addEventListener('focusout',start);
    document.addEventListener('visibilitychange',function(){if(document.hidden)pause();else start();});
    show(0);
    start();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

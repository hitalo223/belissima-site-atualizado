(function(){
  'use strict';

  function setupReveal(){
    var sections=Array.prototype.slice.call(document.querySelectorAll('[data-story-reveal]'));
    if(!('IntersectionObserver' in window)){
      sections.forEach(function(section){section.classList.add('is-story-visible');});
      return;
    }
    var observer=new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-story-visible');
          observer.unobserve(entry.target);
        }
      });
    },{threshold:.16,rootMargin:'0px 0px -7% 0px'});
    sections.forEach(function(section){observer.observe(section);});
  }

  function setupCarousel(root){
    var track=root.querySelector('.grid-carousel-track');
    var slides=Array.prototype.slice.call(root.querySelectorAll('.grid-carousel-track>div'));
    var previous=root.querySelector('[data-grid-prev]');
    var next=root.querySelector('[data-grid-next]');
    var status=root.querySelector('[data-grid-status]');
    var current=0;
    var onceTimer=null;
    var pointerStart=null;

    if(!track||slides.length<1)return;

    function show(index){
      current=(index+slides.length)%slides.length;
      track.style.transform='translate3d(-'+(current*100)+'%,0,0)';
      if(status)status.textContent=(current+1)+' / '+slides.length;
      slides.forEach(function(slide,slideIndex){
        var active=slideIndex===current;
        slide.setAttribute('aria-hidden',active?'false':'true');
        slide.querySelectorAll('a,button').forEach(function(control){control.tabIndex=active?0:-1;});
        slide.querySelectorAll('video').forEach(function(video){
          if(active){var promise=video.play();if(promise&&promise.catch)promise.catch(function(){});}else{video.pause();}
        });
      });
    }

    function cancelOnce(){if(onceTimer){window.clearTimeout(onceTimer);onceTimer=null;}}
    if(previous)previous.addEventListener('click',function(){cancelOnce();show(current-1);});
    if(next)next.addEventListener('click',function(){cancelOnce();show(current+1);});
    root.addEventListener('pointerdown',function(event){pointerStart=event.clientX;});
    root.addEventListener('pointerup',function(event){
      if(pointerStart===null)return;
      var distance=event.clientX-pointerStart;
      pointerStart=null;
      if(Math.abs(distance)>45){cancelOnce();show(current+(distance<0?1:-1));}
    });
    show(0);
    if(root.hasAttribute('data-autoplay-once')&&slides.length>1){
      onceTimer=window.setTimeout(function(){show(1);onceTimer=null;},4200);
    }
  }

  function init(){
    setupReveal();
    document.querySelectorAll('[data-grid-carousel]').forEach(setupCarousel);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

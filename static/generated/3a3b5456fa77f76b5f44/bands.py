"""Two-band lattice Hamiltonian. Pure local generation; no website imports.
H(k,m) = sin(k) sigma_x + (m + cos(k)) sigma_z, energies in units of hopping.
Run: python python/bands.py --output /path/to/artifacts
"""
from pathlib import Path
import argparse,json
import numpy as np
from scipy.linalg import eigvalsh
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def hamiltonian(k,m):
    k=np.asarray(k);h=np.zeros(k.shape+(2,2));h[...,0,0]=m+np.cos(k);h[...,1,1]=-h[...,0,0]
    h[...,0,1]=h[...,1,0]=np.sin(k)
    return h

def calculate(config):
    k=np.linspace(-np.pi,np.pi,config['k_points']);masses=np.linspace(config['mass_min'],config['mass_max'],config['mass_steps'])
    frames=[];error=0.0
    for m in masses:
        energies=np.linalg.eigvalsh(hamiltonian(k,m));analytic=np.sqrt(np.sin(k)**2+(m+np.cos(k))**2)
        error=max(error,float(np.max(np.abs(energies[:,1]-analytic))))
        frames.append({'mass':round(float(m),8),'lower':np.round(energies[:,0],8).tolist(),'upper':np.round(energies[:,1],8).tolist(),'gap':round(float(2*analytic.min()),8)})
    selected=np.array([eigvalsh(h) for h in hamiltonian(k,config['static_mass'])])
    assert error<1e-12,'Numerical eigenvalues disagree with analytic solution'
    return k,selected,{'schemaVersion':1,'model':'sin(k) sigma_x + (m+cos(k)) sigma_z','k':np.round(k,10).tolist(),'frames':frames,'staticMass':config['static_mass'],'maxAnalyticError':error}

def generate(output,config_path=None):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    config=json.loads(Path(config_path or Path(__file__).with_name('parameters.json')).read_text())
    if not 10<=config['k_points']<=1001 or not 2<=config['mass_steps']<=101:raise ValueError('Prototype sample bounds exceeded')
    k,energies,data=calculate(config)
    plt.rcParams.update({'svg.hashsalt':'python-science-lab-bands-v1','font.family':'DejaVu Sans','font.size':11,'axes.spines.top':False,'axes.spines.right':False})
    fig,ax=plt.subplots(figsize=(7.2,4.4),layout='constrained')
    ax.plot(k,energies[:,1],color='#4168b3',label=r'$E_+(k)$',lw=2);ax.plot(k,energies[:,0],color='#b77942',label=r'$E_-(k)$',lw=2)
    ax.axhline(0,color='#9aa4b5',lw=.7);ax.set(xlim=(-np.pi,np.pi),ylim=(-3.2,3.2),xlabel=r'Crystal momentum $k$',ylabel='Energy / hopping',title=f'Two-band lattice model · m = {config["static_mass"]:.2f}')
    ax.set_xticks([-np.pi,-np.pi/2,0,np.pi/2,np.pi],[r'$-\pi$',r'$-\pi/2$','0',r'$\pi/2$',r'$\pi$']);ax.grid(alpha=.15);ax.legend(frameon=False,loc='upper right')
    fig.savefig(output/'bands.svg',metadata={'Date':None,'Creator':'Python Science Lab'});fig.savefig(output/'bands.png',dpi=170,metadata={'Software':'Python Science Lab'});plt.close(fig)
    (output/'bands.json').write_text(json.dumps(data,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n')
    return data

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);args=p.parse_args();data=generate(args.output)
    print(f'Generated SVG, PNG, JSON; {len(data["frames"])} parameter frames; analytic error {data["maxAnalyticError"]:.3g}')

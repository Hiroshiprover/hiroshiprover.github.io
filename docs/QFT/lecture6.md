---
title: Lecture 6 板书记录（原始整理稿）
draft: true
---

# Lecture 6 板书记录

**用途**：本文件是 lecture6 板书的原始整理稿，按照片顺序逐张整理，每张图片为一段（以小标题分隔）；供后续并入正文时参考，不做笔记式改写。

**来源**：`qft_boardnote/lecture6/`，照片编号 IMG_8433–8450，其中缺号 IMG_8436、IMG_8448，共 16 张。

**标记约定**：〔待核查：…〕= 疑似板书笔误或与上下文不一致处，保持原样待核查；【补全：…】= 照片缺失或遮挡处，由整理者按上下文补写；〔红笔〕〔蓝笔〕等注明板书上的彩色批注。公式按板书原样转写（LaTeX）。

（进度：16/16）

## IMG_8433

复习（"Last time"）：

- Hamiltonian；
- Noether theorem：
$$
J_\varepsilon^\mu=\frac{\partial\mathcal L}{\partial(\partial_\mu\phi)}\,\Delta_\varepsilon-K_\varepsilon^\mu
$$
- U(1) symmetry；
- Spacetime translation invariance：
$$
x^\mu\longmapsto x'^\mu=x^\mu+a^\mu
$$
（红笔：$\mu\in\{0,1,2,3\}$，$\Rightarrow$ 4 symmetries），
$$
\Longrightarrow\quad
\phi(x)\longmapsto\phi(x+a)=\phi(x)+a^\mu\partial_\mu\phi(x)
$$
$$
\Longrightarrow\quad
\Delta_{a,\mu}=\partial_\mu\phi
$$
- $\mathcal L$ is scalar：
$$
\mathcal L(x)\longmapsto\mathcal L(x+a)=\mathcal L(x)+a^\mu\partial_\mu\mathcal L.
$$

右侧红笔部分（诺特定理的结构）：

$$
\phi'(x)=\phi(x)+\varepsilon\Delta_\varepsilon
$$

（红笔注明：same $x$。）

$$
\begin{cases}
\phi(x)\longmapsto\phi(x)+\varepsilon\Delta_\varepsilon\\
\mathcal L\longmapsto\mathcal L+\varepsilon\partial_\mu K_\varepsilon^\mu
\end{cases}
$$

$$
S=\int d^4x\,\mathcal L,
\qquad
S\longmapsto S
$$

$S\longmapsto S$ 红笔框出；红笔注明 assumes（假定）$d^4x'=d^4x$（红笔框出），适用于：spacetime translations、Lorentz transformation（$|\det\Lambda|=1$）。

另一处：

$$
\phi'(x')=\phi(x)
$$

（红笔注明：not same $x$。）

<!-- FILLED:8433 -->

## IMG_8434

（先解释 $a^\mu$ 的指标）Index on $a^\mu$ is a label：

$$
a^\mu\partial_\mu\mathcal L=a^\nu\partial_\mu(\mathcal L\,\delta^\mu{}_\nu)
$$

（红笔标注 label，并注 $=K^\mu_{a,\nu}$，即与规则比较得 $K^\mu_{a,\nu}=\mathcal L\,\delta^\mu{}_\nu$。）

$$
\Longrightarrow\quad
J^\mu_{a,\nu}
=\frac{\partial\mathcal L}{\partial(\partial_\mu\phi)}\,\Delta_{a,\nu}
-K^\mu_{a,\nu}
$$

（红笔：label：4 Noether currents。）

$$
=\frac{\partial\mathcal L}{\partial(\partial_\mu\phi)}\,\partial_\nu\phi
-\mathcal L\,\delta^\mu{}_\nu
\equiv-T^\mu{}_\nu.
$$

其中（框出）：

$$
\boxed{
T^\mu{}_\nu=\mathcal L\,\delta^\mu{}_\nu
-\frac{\partial\mathcal L}{\partial(\partial_\mu\phi)}\,\partial_\nu\phi
}
$$

（板书注：(canonical) Energy-momentum tensor。）

〔说明：板书 $J^\mu_{a,\nu}\equiv-T^\mu{}_\nu$，其中 $T^\mu{}_\nu=\mathcal L\,\delta^\mu{}_\nu-\dfrac{\partial\mathcal L}{\partial(\partial_\mu\phi)}\,\partial_\nu\phi$；这与 06 页现行约定一致（$T^\mu{}_\nu\equiv-J^\mu_{a,\nu}$，取 $T^{00}=\mathcal H$ 为能量密度，见该页斜体说明）。按此定义，对自由标量场 $T^0{}_0=-\mathcal H$、$J^0_{a,0}=T^{00}=\mathcal H$。〕

<!-- FILLED:8434 -->

## IMG_8435

Noether theorem（平移情形）：

$$
\partial_\mu J^\mu_{a,\nu}=0
\quad\Longrightarrow\quad
\boxed{\partial_\mu T^\mu{}_\nu=0}
$$

右侧注明：Conservation of energy and momentum（能量与动量守恒）。

4 Noether charges（四条诺特荷；右侧红笔回填 $Q_\varepsilon\equiv\int d^3x\,J_\varepsilon^0$）：

$\nu=0$：

$$
\int d^3x\,J^0_{a,0}=-\int d^3x\,T^0{}_0
\qquad (T^0{}_0=-T^{00}),
$$

$$
=\boxed{\int d^3x\,T^{00}\equiv\mathcal E}
$$

（注明：total energy of the system。）

$\nu=i\ (1,2,3)$：

$$
\int d^3x\,J^0_{a,i}=-\int d^3x\,T^0{}_i\equiv-P_i,
$$

$$
\Longrightarrow\quad
\boxed{P_i=\int d^3x\,T^{0i}}
$$

（注明：total momentum of the system。）

<!-- FILLED:8435 -->

## IMG_8437

$$
T^{00}\ \longrightarrow\ \text{energy density}
$$

$$
T^{0i}\ \longrightarrow\ \text{momentum (in direction }i\text{) density}
$$

Note：$\boxed{\mathcal E=H}$ after evaluating each on-shell, i.e. on the physical configuration of the field (not as functions)。（即 $\mathcal E=H$ 要在在壳、物理位形上求值后成立，不是作为泛函的恒等式。）

Proof：

$$
T^{00}=-T^0{}_0
=\frac{\partial\mathcal L}{\partial(\partial_0\phi)}\,\partial_0\phi-\mathcal L
=\pi\dot\phi-\mathcal L
=\mathcal H
$$

（红笔：$\dfrac{\partial\mathcal L}{\partial(\partial_0\phi)}\equiv\pi$，$\partial_0\phi=\dot\phi$。）

$$
\int d^3x\,T^{00}=\int d^3x\,\mathcal H=H.
$$

<!-- FILLED:8437 -->

## IMG_8438

（上板为 IMG_8435 中同一区域的另一张照片，内容一致，此处不再重复；以下是该照片中新出现的部分。）

（黑板）Also：

$$
\boxed{\vec P=-\int d^3x\,\pi\,\vec\nabla\phi}
\qquad\text{(exercise)}
$$

- External sources $\longrightarrow$ physical effect independent of the field.（外部源产生的物理效应与场无关。）

$$
\Longrightarrow\quad
\mathcal L_{\mathrm{tot}}=\mathcal L[\phi]+\phi\,J(x)
$$

（黄绿笔：external source，标注在 $J(x)$ 下。）

<!-- FILLED:8438 -->

## IMG_8439

Ex. electrodynamics（例子：电动力学）：

ELEqn：

$$
\partial_\mu F^{\mu\nu}+J^\nu=0
$$

$$
\mathcal L_{\mathrm{tot}}=-\frac14F^{\mu\nu}F_{\mu\nu}+A_\mu J^\mu
$$

（注明：$J^\mu$ = electric 4-current，电四维电流。）

$$
F^{0i}=E^i=\text{electric field}
$$

$$
F^{ij}=\varepsilon^{ij}{}_k B^k=\text{magnetic field}
$$

$$
J^0\equiv\rho=\text{electric charge density}
$$

$$
\vec J\equiv\text{electric 3-current}
$$

<!-- FILLED:8439 -->

## IMG_8440

（$\partial_\mu F^{\mu\nu}+J^\nu=0$ 的分量形式：）

$$
\nu=0:\quad
\partial_i F^{i0}+J^0=0
\quad\longrightarrow\quad
-\vec\nabla\cdot\vec E+\rho=0\quad\checkmark
$$

（黄笔注：$F^{i0}=-E^i$。）

$$
\nu=j:\quad
\partial_0 F^{0j}+\partial_i F^{ij}+J^j=0
$$

（黄笔注：$\partial_0 F^{0j}=\dfrac{\partial E^j}{\partial t}$。）

$$
\partial_i F^{ij}=\varepsilon^{ij}{}_k\,\partial_i B^k
=-\varepsilon^{ji}{}_k\,\partial_i B^k
=-(\vec\nabla\times\vec B)^j
$$

$$
\longrightarrow\quad
\frac{\partial\vec E}{\partial t}-\vec\nabla\times\vec B+\vec J=0\quad\checkmark
$$

<!-- FILLED:8440 -->

## IMG_8441

Ex: scalar field with static point source（带静态点源的标量场）：

$$
\mathcal L_{\mathrm{tot}}=-\frac12(\partial\phi)^2-\frac{m^2}{2}\phi^2+\phi J,
\qquad
J(x)\equiv\alpha\,\delta^3(\vec x)
$$

（注明：$\alpha$ constant。）

ELEqn：

$$
\longrightarrow\quad
\Box\phi-m^2\phi=-\alpha\,\delta^3(\vec x).
$$

We look for the particular solution $\phi(\vec x)$ that vanishes at $|\vec x|\to\infty$ sufficiently fast, so we can do a Fourier transform：

$$
\boxed{\phi(\vec x)=\int\frac{d^3k}{(2\pi)^3}\,\phi_{\vec k}\,e^{i\vec k\cdot\vec x}}
\qquad\longleftrightarrow\qquad
\phi_{\vec k}=\int d^3x\,\phi(\vec x)\,e^{-i\vec k\cdot\vec x}
$$

<!-- FILLED:8441 -->

## IMG_8442

Recall：

$$
\delta^3(\vec x)=\int\frac{d^3k}{(2\pi)^3}\,e^{i\vec k\cdot\vec x}
$$

$$
\delta^4(x)=\int\frac{d^4k}{(2\pi)^4}\,e^{ikx}
$$

（红笔注：$kx\equiv -kt+\vec k\cdot\vec x$。）

（静态情形下）

$$
\longrightarrow\quad
\Box\phi=\nabla^2\phi
=-\int\frac{d^3k}{(2\pi)^3}\,\phi_{\vec k}\,|\vec k|^2\,e^{i\vec k\cdot\vec x}
$$

$$
\longrightarrow\quad
-\phi_{\vec k}|\vec k|^2-m^2\phi_{\vec k}=-\alpha
\quad\longrightarrow\quad
\phi_{\vec k}=\frac{\alpha}{|\vec k|^2+m^2}
$$

$$
\longrightarrow\quad
\phi(\vec x)=\alpha\int\frac{d^3k}{(2\pi)^3}\,\frac{e^{i\vec k\cdot\vec x}}{\vec k^{\,2}+m^2}
$$

右侧注记：Spherical symmetry（球对称）：$\vec x=(0,0,r)$；

$$
\vec k=|\vec k|\,(\sin\theta\cos\varphi,\ \sin\theta\sin\varphi,\ \cos\theta)
\qquad(|\vec k|\equiv k)
$$

<!-- FILLED:8442 -->

## IMG_8443

（上板为 IMG_8441 中同一区域的另一张照片，内容一致；以下是该照片中新写的求值过程。）

$$
\longrightarrow\quad
\phi(r)=\alpha\cdot\frac{2\pi}{(2\pi)^3}
\int_0^\infty k^2dk\int_0^\pi\sin\theta\,d\theta\,
\frac{e^{ikr\cos\theta}}{k^2+m^2}
$$

$$
=\frac{\alpha}{4\pi^2}\int_0^\infty dk\,\frac{k^2}{k^2+m^2}
\int_{-1}^{1}d\cos\theta\,e^{ikr\cos\theta}
$$

（红笔注：$k\to-k\ \Rightarrow\ -\int_0^\infty=+\int_{-\infty}^0$。）

$$
=\frac{e^{ikr}-e^{-ikr}}{ikr}
$$

$$
=-\frac{i\alpha}{4\pi^2r}\int_{-\infty}^{\infty}dk\,
\frac{k\,e^{ikr}}{k^2+m^2}
$$

（红笔注：poles $k=\pm im$；红笔围道图：闭合于上半平面的半圆，弧上 $\sim e^{-|k|r}\to0$，极点 $+im$ 在围道内、$-im$ 在外。）

<!-- FILLED:8443 -->

## IMG_8444

（留数计算，续 IMG_8443。）

$$
=-\frac{i\alpha}{4\pi^2r}\cdot 2\pi i
\underset{k=im}{\operatorname{Res}}\,\frac{k\,e^{ikr}}{k^2+m^2}
$$

$$
\underset{k=im}{\operatorname{Res}}
\frac{k\,e^{ikr}}{(k+im)(k-im)}
=\left.\frac{k\,e^{ikr}}{k+im}\right|_{k=im}
=\frac{im\,e^{-mr}}{2im}
$$

$$
\boxed{\phi(r)=\frac{\alpha}{4\pi}\,\frac{e^{-mr}}{r}}
$$

（注明：Yukawa potential，汤川势。）

If $m=0$：

$$
\phi(r)=\frac{\alpha}{4\pi}\,\frac{1}{r}
$$

（注明：Coulomb potential，库仑势。）

<!-- FILLED:8444 -->

## IMG_8445

（上板为 IMG_8443 中同一区域的另一张照片，内容一致；以下是该照片中新写的部分。）

**Field quantization**（场量子化；标题加下划线）

Klein-Gordon eqn（$\Box\phi-m^2\phi=0$，real $\phi$）

General sol. $\to$ superposition of plane waves（平面波叠加）$\sim e^{i\vec p\cdot\vec x}$

$$
\Longrightarrow\quad
\phi(x)=\int\frac{d^3p}{(2\pi)^3}\,u_p(t)\,a_{\vec p}\,e^{i\vec p\cdot\vec x}
$$

（黄笔注：Fourier transform in 3D，指向积分测度；"mode function"，指向 $u_p(t)$；indep. of $t$，指向 $a_{\vec p}$，即 $a_{\vec p}$ 不依赖 $t$。）

$$
\text{i.e.}\quad
\phi_{\vec p}(t)\equiv u_p(t)\,a_{\vec p}
$$

<!-- FILLED:8445 -->

## IMG_8446

Substitute in KG eqn（代入 K–G 方程）：

$$
-\ddot u_p-\vec p^{\,2}u_p-m^2u_p=0
\qquad
\left(\Box\phi=-\partial_t^2\phi+\vec\nabla^2\phi\right)
$$

$$
\longrightarrow\quad
u_p=A_p\,e^{-i\omega_p t}+B_p\,e^{i\omega_p t}
$$

（黄笔注：integration const.，指向 $A_p$ 与 $B_p$，即二者为积分常数。）

where：

$$
\boxed{\omega_p\equiv\sqrt{\vec p^{\,2}+m^2}}
$$

$$
\longrightarrow\quad
\phi(x)=\int\frac{d^3p}{(2\pi)^3}
\left[
A_p\,a_{\vec p}\,e^{-i\omega_p t+i\vec p\cdot\vec x}
+B_p\,a_{\vec p}\,e^{i\omega_p t+i\vec p\cdot\vec x}
\right]
$$

<!-- FILLED:8446 -->

## IMG_8447

Since $A_p$、$B_p$、$a_{\vec p}$ are so far arbitrary（三个量目前都还是任意的），we define：

$$
A_p\,a_{\vec p}\equiv\frac{1}{\sqrt{2\omega_p}}\,a_{\vec p}
$$

$$
B_p\,a_{\vec p}\equiv\frac{1}{\sqrt{2\omega_p}}\,b_{\vec p}
$$

$$
\Longrightarrow\quad
\phi(x)=\int\frac{d^3p}{(2\pi)^3}\,\frac{1}{\sqrt{2\omega_p}}
\left[
a_{\vec p}\,e^{-i\omega_p t+i\vec p\cdot\vec x}
+b_{\vec p}\,e^{i\omega_p t+i\vec p\cdot\vec x}
\right]
$$

<!-- FILLED:8447 -->

## IMG_8449

（上板为 IMG_8446 中同一区域的另一张照片，内容一致；以下是该照片中新写的部分。）

Impose $\phi^*=\phi$（施加实场条件）：

$$
\phi^*(x)=\int\frac{d^3p}{(2\pi)^3\sqrt{2\omega_p}}
\left[
a_{\vec p}^*\,e^{i\omega_p t-i\vec p\cdot\vec x}
+b_{\vec p}^*\,e^{-i\omega_p t-i\vec p\cdot\vec x}
\right]
$$

（$\vec p\to-\vec p$）

$$
=\int\frac{d^3p}{(2\pi)^3\sqrt{2\omega_p}}
\left[
b_{-\vec p}^*\,e^{-i\omega_p t+i\vec p\cdot\vec x}
+a_{-\vec p}^*\,e^{i\omega_p t+i\vec p\cdot\vec x}
\right]
$$

$$
\Longrightarrow\quad
b_{-\vec p}^*=a_{\vec p}
\quad\text{and}\quad
a_{-\vec p}^*=b_{\vec p}
\qquad(\sim\text{actually equivalent})
$$

<!-- FILLED:8449 -->

## IMG_8450

（上板为 IMG_8447 中同一区域的另一张照片，内容一致；以下是该照片中新写的部分。）

Final solution（最终解）：

$$
\phi(x)=\int\frac{d^3p}{(2\pi)^3\sqrt{2\omega_p}}
\left[
a_{\vec p}\,e^{-i\omega_p t+i\vec p\cdot\vec x}
+a_{-\vec p}^*\,e^{i\omega_p t+i\vec p\cdot\vec x}
\right]
$$

（黄笔注：$\vec p\to-\vec p$，指向第二项。）

$$
\longrightarrow\quad
\phi(x)=\int\frac{d^3p}{(2\pi)^3\sqrt{2\omega_p}}
\left[
a_{\vec p}\,e^{-i\omega_p t+i\vec p\cdot\vec x}
+a_{\vec p}^*\,e^{-(-i\omega_p t+i\vec p\cdot\vec x)}
\right]
$$

<!-- FILLED:8450 -->
